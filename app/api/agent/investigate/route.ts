import { NextRequest } from 'next/server';
import { getZombies } from '@/lib/queries';
import { getAnthropic, MODEL } from '@/lib/anthropic';
import { cached } from '@/lib/cache';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Autonomous-investigator endpoint.
 *
 * Single streaming call: the model receives a slate of 30 candidate zombies
 * (with their accountability signals AND top 2 grants for context) and must:
 *   1) Pick ONE — emit <selection>{...}</selection>
 *   2) Justify the pick — emit <reasoning>...</reasoning>
 *   3) Write the forensic narrative — emit <narrative>...</narrative>
 *   4) List red flags — emit <red_flags>...</red_flags>
 *
 * The selection logic is NOT pre-coded. The model autonomously identifies
 * the most newsworthy case and writes the case in one pass.
 */
export async function GET(_req: NextRequest) {
  let anthropic;
  try {
    anthropic = getAnthropic();
  } catch (e: any) {
    return new Response(`Anthropic key missing: ${e.message}`, { status: 500 });
  }

  const candidates = await cached('agent:candidates', 600, () => getZombies({ limit: 30 }));

  // Enrich each candidate with its top grant for narrative-grounding.
  // Cached aggressively — same query for the same slate.
  const enriched = await cached('agent:enriched', 600, async () => {
    return Promise.all(
      candidates.map(async (z) => {
        const topGrant = await q<any>(
          `
          SELECT 'FED'::text AS source, g.agreement_value::numeric AS amount,
                 g.agreement_start_date::text AS date,
                 g.owner_org_title AS department,
                 COALESCE(g.agreement_title_en, g.prog_name_en) AS purpose
          FROM general.entity_source_links esl
          JOIN fed.grants_contributions g ON g._id = (esl.source_pk->>'_id')::bigint
          WHERE esl.entity_id = $1 AND esl.source_schema = 'fed'
            AND esl.source_table = 'grants_contributions'
            AND g.agreement_value > 0
          ORDER BY g.agreement_value DESC LIMIT 1
          UNION ALL
          SELECT 'AB'::text AS source, g.amount::numeric AS amount,
                 g.payment_date::text AS date, g.ministry AS department,
                 g.program AS purpose
          FROM general.entity_source_links esl
          JOIN ab.ab_grants g ON g.id = (esl.source_pk->>'id')::int
          WHERE esl.entity_id = $1 AND esl.source_schema = 'ab'
            AND esl.source_table = 'ab_grants' AND g.amount > 0
          ORDER BY g.amount DESC LIMIT 1
          `,
          [z.entity_id]
        ).catch(() => []);
        return {
          entity_id: z.entity_id,
          name: z.canonical_name,
          province: z.province,
          total_funding: Math.round(z.total_funding),
          fed_total: Math.round(z.fed_total),
          ab_total: Math.round(z.ab_total),
          cra_govt_share_pct: z.cra_govt_share_pct,
          cra_latest_year: z.cra_latest_year,
          fed_latest_grant: z.fed_latest_grant,
          ab_registry_status: z.ab_status,
          signal_label: z.signal_label,
          top_grants: topGrant.map((g: any) => ({
            source: g.source,
            amount: Number(g.amount),
            date: g.date,
            department: g.department,
            purpose: g.purpose,
          })),
        };
      })
    );
  });

  const candidateById = new Map(enriched.map((c) => [c.entity_id, c]));

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      // Heartbeat so curl/proxies see bytes immediately
      send('start', { candidates: enriched.length });

      try {
        const llmStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1100,
          system: `You are an autonomous accountability investigator for Canadian taxpayers, in CBC investigative-journalism voice.

You will be given a slate of ${enriched.length} candidate organizations from open Canadian government data, each flagged as a "zombie recipient" (received public funding then ceased meaningful operations). For each candidate you receive: name, province, total public funding, federal and Alberta totals, CRA government-revenue share, last filed T3010 year, most recent federal grant date, Alberta registry status, the deterministic signal label, and (where available) the largest single grant on record.

You must do four things, in order:

1. PICK ONE case the public most needs to know about. Don't default to the largest dollar amount. Pick the one with the most striking, most teachable, most defensible accountability story. Look for:
   - Federal money flowing AFTER a charity stopped reporting.
   - Federal money flowing AFTER an Alberta dissolution.
   - Near-total public-revenue dependency followed by silent cessation.
   Avoid likely amalgamations (regional health authorities, Crown corporations, large national hospitals).

2. JUSTIFY your pick. 2–3 sentences naming the specific data point that made you choose it.

3. WRITE A FORENSIC NARRATIVE on the chosen case. 3 paragraphs, 180–230 words. Cite specific dollar amounts, dates, and department names from the candidate's data only. No speculation about intent. CBC investigative tone. No headings. If the candidate looks like an amalgamation, say so explicitly rather than imply wrongdoing.

4. LIST 3–5 red flags. Each ≤15 words, citing a specific data point.

# Hard rules
- entity_id MUST be from the slate. Do not invent.
- Numbers, dates, and department names in the narrative MUST come from the candidate's record in the slate.
- If a fact isn't in the slate, omit it — never invent.

# Output format (EXACT, nothing before, nothing after)

<selection>{"entity_id": <int>, "headline": "<one short sentence>"}</selection>
<reasoning>2-3 sentences naming the specific data point.</reasoning>
<narrative>
3 paragraphs of prose, 180-230 words.
</narrative>
<red_flags>
- bullet 1
- bullet 2
- (3-5 bullets)
</red_flags>`,
          messages: [
            {
              role: 'user',
              content: `Here is the candidate slate. Pick one and write the case. Begin your response with "<selection>" — no preamble, no markdown, output the four blocks in the exact order specified.\n\n${JSON.stringify(
                enriched,
                null,
                2
              )}`,
            },
          ],
        });

        let buffer = '';
        let selectionEmitted = false;

        for await (const event of llmStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const delta = event.delta.text;
            buffer += delta;

            // As soon as we see </selection>, parse it and emit a selection event
            if (!selectionEmitted) {
              const m = buffer.match(/<selection>([\s\S]*?)<\/selection>/);
              if (m) {
                try {
                  const obj = JSON.parse(m[1].trim());
                  const chosen = candidateById.get(obj.entity_id);
                  if (chosen) {
                    send('selection', {
                      entity_id: obj.entity_id,
                      headline: obj.headline,
                      candidate: chosen,
                    });
                    selectionEmitted = true;
                  }
                } catch {
                  // Will retry on next delta
                }
              }
            }

            // Always forward delta tokens for the live narrative typewriter
            send('delta', { text: delta });
          }
        }

        send('done', {});
      } catch (e: any) {
        send('error', { message: e.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}

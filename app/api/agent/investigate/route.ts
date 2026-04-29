import { NextRequest } from 'next/server';
import { getZombies } from '@/lib/queries';
import { getAnthropic, MODEL } from '@/lib/anthropic';
import { cached } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
const CANDIDATE_LIMIT = 12;

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

  const candidates = await cached(`agent:candidates:${CANDIDATE_LIMIT}`, 600, () =>
    getZombies({ limit: CANDIDATE_LIMIT })
  );

  // Compact slate — just the comparable signals. Skips per-candidate grant
  // detail to stay within Vercel's 60s function budget on cold start; the
  // model still picks autonomously from these 11 fields per candidate.
  const enriched = candidates.map((z) => ({
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
    top_grants: [] as Array<{
      source: string;
      amount: number;
      date: string | null;
      department: string | null;
      purpose: string | null;
    }>,
  }));

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
          max_tokens: 900,
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

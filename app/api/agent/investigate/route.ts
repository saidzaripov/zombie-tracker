import { NextRequest } from 'next/server';
import { getAnthropic, MODEL } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Build-time slate snapshot.
 *
 * Why static: the hackathon's shared `general.vw_entity_funding` is
 * unmaterialized and recomputed per query. Under hackathon-day load it
 * spikes to 4+ minute response times — far past Vercel's 60s function
 * limit. Baking the slate at deploy time keeps the agent endpoint pure
 * LLM (no DB roundtrip), so the autonomous-selection demo works
 * regardless of upstream DB load.
 *
 * Refreshed: 2026-04-29 morning. Same 8 entries the live query returns
 * for getZombies({ limit: 8 }) when the DB isn't overloaded.
 */
const SNAPSHOT_DATE = '2026-04-29';

const STATIC_SLATE = [
  {
    entity_id: 20310,
    name: "St. Stephen's Community House",
    province: 'ON',
    total_funding: 115216386,
    fed_total: 94356807,
    ab_total: 0,
    cra_govt_share_pct: 73.84,
    cra_latest_year: 2020,
    fed_latest_grant: '2022-04-01',
    ab_registry_status: null,
    signal_label: '74% public revenue · last T3010 2020',
  },
  {
    entity_id: 82976,
    name: 'Northwest Inter-Nation Family and Community Services Society',
    province: 'BC',
    total_funding: 114368003,
    fed_total: 101785257,
    ab_total: 0,
    cra_govt_share_pct: 100,
    cra_latest_year: 2021,
    fed_latest_grant: '2021-04-01',
    ab_registry_status: null,
    signal_label: '100% public revenue · last T3010 2021',
  },
  {
    entity_id: 66857,
    name: 'TRILLIUM GIFT OF LIFE NETWORK',
    province: 'ON',
    total_funding: 108687937,
    fed_total: 172401,
    ab_total: 0,
    cra_govt_share_pct: 100,
    cra_latest_year: 2021,
    fed_latest_grant: '2019-10-07',
    ab_registry_status: null,
    signal_label: '100% public revenue · last T3010 2021',
  },
  {
    entity_id: 35730,
    name: 'ADDICTIONS FOUNDATION OF MANITOBA',
    province: 'MB',
    total_funding: 107567019,
    fed_total: 1000,
    ab_total: 0,
    cra_govt_share_pct: 94,
    cra_latest_year: 2022,
    fed_latest_grant: '2019-08-27',
    ab_registry_status: null,
    signal_label: '94% public revenue · last T3010 2022',
  },
  {
    entity_id: 25461,
    name: 'CANADIAN MENTAL HEALTH ASSOCIATION, THAMES VALLEY ADDICTION & MENTAL HEALTH SERVICES',
    province: 'ON',
    total_funding: 63879195,
    fed_total: 289758,
    ab_total: 0,
    cra_govt_share_pct: 80,
    cra_latest_year: 2021,
    fed_latest_grant: '2022-04-25',
    ab_registry_status: null,
    signal_label: '80% public revenue · last T3010 2021',
  },
  {
    entity_id: 22019,
    name: 'UNITED WAY CENTRAL AND NORTHERN VANCOUVER ISLAND',
    province: 'BC',
    total_funding: 60777654,
    fed_total: 100000,
    ab_total: 0,
    cra_govt_share_pct: 81,
    cra_latest_year: 2021,
    fed_latest_grant: '2021-04-26',
    ab_registry_status: null,
    signal_label: '81% public revenue · last T3010 2021',
  },
  {
    entity_id: 81561,
    name: 'ABILITY SOCIETY OF ALBERTA',
    province: 'AB',
    total_funding: 27904744,
    fed_total: 1500,
    ab_total: 21165568,
    cra_govt_share_pct: null,
    cra_latest_year: 2021,
    fed_latest_grant: '2007-11-05',
    ab_registry_status: 'Struck',
    signal_label: 'Struck from Alberta registry',
  },
  {
    entity_id: 53984,
    name: 'The Brenda Strafford Society for the Prevention of Domestic Violence',
    province: 'AB',
    total_funding: 18860087,
    fed_total: 180957,
    ab_total: 9503269,
    cra_govt_share_pct: 59.91,
    cra_latest_year: 2021,
    fed_latest_grant: '2022-04-25',
    ab_registry_status: 'Dissolved',
    signal_label: 'Dissolved (Alberta registry)',
  },
];

/**
 * Autonomous-investigator endpoint.
 *
 * One streaming Claude call: the model receives the slate and must
 *   1) Pick ONE — emit <selection>{...}</selection>
 *   2) Justify the pick — emit <reasoning>...</reasoning>
 *   3) Write the forensic narrative — emit <narrative>...</narrative>
 *   4) List red flags — emit <red_flags>...</red_flags>
 *
 * Selection logic is NOT pre-coded. The data layer applies the deterministic
 * "ceased operations" filter; the model decides which case is the most
 * teachable accountability story and writes the case in one pass.
 */
export async function GET(_req: NextRequest) {
  let anthropic;
  try {
    anthropic = getAnthropic();
  } catch (e: any) {
    return new Response(`Anthropic key missing: ${e.message}`, { status: 500 });
  }

  const enriched = STATIC_SLATE.map((s) => ({
    ...s,
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

      send('start', { candidates: enriched.length, snapshot_date: SNAPSHOT_DATE });

      try {
        const llmStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 800,
          system: `You are an autonomous accountability investigator for Canadian taxpayers, in CBC investigative-journalism voice.

You will be given a slate of ${enriched.length} candidate organizations from open Canadian government data, each flagged as a "zombie recipient" (received public funding then ceased meaningful operations). For each candidate you receive: name, province, total public funding, federal and Alberta totals, CRA government-revenue share, last filed T3010 year, most recent federal grant date, Alberta registry status, the deterministic signal label.

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
                  /* will retry on next delta */
                }
              }
            }

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

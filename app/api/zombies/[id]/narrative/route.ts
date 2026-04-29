import { NextRequest } from 'next/server';
import { getDossier } from '@/lib/queries';
import { getAnthropic, MODEL, DOSSIER_SYSTEM_PROMPT } from '@/lib/anthropic';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entityId = Number(id);
  if (!Number.isFinite(entityId)) {
    return new Response('invalid id', { status: 400 });
  }

  const dossier = await getDossier(entityId);
  if (!dossier) return new Response('not found', { status: 404 });

  let anthropic;
  try {
    anthropic = getAnthropic();
  } catch (e: any) {
    return new Response(`Anthropic key missing: ${e.message}`, { status: 500 });
  }

  const z = dossier.zombie;

  const dataBlock = JSON.stringify(
    {
      organization: z.canonical_name,
      business_number: z.bn_root,
      province: z.province,
      total_public_funding_received: z.total_funding,
      federal_funding: z.fed_total,
      alberta_funding: z.ab_total,
      cra_government_share_of_revenue_pct: z.cra_govt_share_pct,
      cra_last_t3010_filed_year: z.cra_latest_year,
      alberta_registry_status: z.ab_status,
      zombie_signal: z.signal_label,
      most_recent_federal_grant_date: z.fed_latest_grant,
      top_grants: dossier.topGrants.slice(0, 5).map((g) => ({
        source: g.source,
        amount: g.amount,
        date: g.date,
        department: g.department,
        purpose: g.purpose,
      })),
      cra_financials_last_filed: dossier.craFinancials,
    },
    null,
    2
  );

  const userPrompt = `Investigate this zombie recipient. Use only the data provided.\n\n<data>\n${dataBlock}\n</data>`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        const llmStream = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 700,
          system: DOSSIER_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
        });
        for await (const event of llmStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            send('delta', { text: event.delta.text });
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

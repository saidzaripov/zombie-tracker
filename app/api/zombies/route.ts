import { NextRequest, NextResponse } from 'next/server';
import { getZombies } from '@/lib/queries';
import { cached } from '@/lib/cache';
import { BAKED_ZOMBIES } from '@/lib/baked';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const source = (sp.get('source') as 'fed' | 'ab' | 'all' | null) ?? undefined;
  const province = sp.get('province') ?? undefined;
  const minFunding = sp.get('minFunding') ? Number(sp.get('minFunding')) : undefined;
  const limit = sp.get('limit') ? Number(sp.get('limit')) : 100;

  const cacheKey = `zombies:${source ?? 'all'}:${province ?? 'all'}:${minFunding ?? 'def'}:${limit}`;

  try {
    const zombies = await cached(cacheKey, 600, () =>
      getZombies({ source, province, minFunding, limit })
    );
    return NextResponse.json({ zombies, count: zombies.length, src: 'live' });
  } catch (e: any) {
    console.error('GET /api/zombies — falling back to baked:', e.message);
    let z = [...BAKED_ZOMBIES];
    if (source === 'fed') z = z.filter((x) => x.fed_total > 0);
    if (source === 'ab') z = z.filter((x) => x.ab_total > 0);
    if (province) z = z.filter((x) => x.province === province);
    if (minFunding) z = z.filter((x) => x.total_funding >= minFunding);
    z = z.slice(0, limit);
    return NextResponse.json({ zombies: z, count: z.length, src: 'snapshot' });
  }
}

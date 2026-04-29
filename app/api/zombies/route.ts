import { NextRequest, NextResponse } from 'next/server';
import { getZombies } from '@/lib/queries';
import { cached } from '@/lib/cache';

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
    const zombies = await cached(cacheKey, 300, () =>
      getZombies({ source, province, minFunding, limit })
    );
    return NextResponse.json({ zombies, count: zombies.length });
  } catch (e: any) {
    console.error('GET /api/zombies failed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

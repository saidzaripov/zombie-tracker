import { NextResponse } from 'next/server';
import { getTotalFundingLost } from '@/lib/queries';
import { cached } from '@/lib/cache';
import { BAKED_TOTAL } from '@/lib/baked';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const total = await cached('totals:lost', 600, () => getTotalFundingLost());
    return NextResponse.json({ total, source: 'live' });
  } catch (e: any) {
    console.error('GET /api/totals — falling back to baked:', e.message);
    return NextResponse.json({ total: BAKED_TOTAL, source: 'snapshot' });
  }
}

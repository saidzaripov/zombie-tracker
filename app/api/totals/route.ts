import { NextResponse } from 'next/server';
import { getTotalFundingLost } from '@/lib/queries';
import { cached } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const total = await cached('totals:lost', 600, () => getTotalFundingLost());
    return NextResponse.json({ total });
  } catch (e: any) {
    console.error('GET /api/totals failed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

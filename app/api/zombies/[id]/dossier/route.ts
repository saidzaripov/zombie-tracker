import { NextRequest, NextResponse } from 'next/server';
import { getDossier } from '@/lib/queries';
import { cached } from '@/lib/cache';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entityId = Number(id);
  if (!Number.isFinite(entityId)) {
    return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  }
  try {
    const dossier = await cached(`dossier:${entityId}`, 600, () => getDossier(entityId));
    if (!dossier) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(dossier);
  } catch (e: any) {
    console.error('GET /api/zombies/[id]/dossier failed:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

'use client';
import { Database } from 'lucide-react';

export function SnapshotBadge({ src }: { src: 'live' | 'snapshot' | null }) {
  if (!src) return null;
  if (src === 'live') {
    return (
      <div className="px-4 pt-1">
        <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" /> Live data
        </div>
      </div>
    );
  }
  return (
    <div className="px-4 pt-1">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-400">
        <Database size={10} /> Snapshot mode · DB throttled
      </div>
    </div>
  );
}

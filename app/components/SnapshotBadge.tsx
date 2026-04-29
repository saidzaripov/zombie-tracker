'use client';

/**
 * Visible only when running on live data — quiet positive signal.
 * For snapshot mode we stay silent: the methodology sheet covers it,
 * and a "throttled" warning would alarm non-technical viewers.
 */
export function SnapshotBadge({ src }: { src: 'live' | 'snapshot' | null }) {
  if (src !== 'live') return null;
  return (
    <div className="px-4 pt-1">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-500">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" /> Live data
      </div>
    </div>
  );
}

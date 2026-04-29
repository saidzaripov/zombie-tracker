'use client';
import { useEffect, useState } from 'react';
import { formatMoney } from '../lib-client/format';

export function HeaderTicker() {
  const [total, setTotal] = useState<number | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    fetch('/api/totals')
      .then((r) => r.json())
      .then((d) => setTotal(d.total ?? 0))
      .catch(() => setTotal(0));
  }, []);

  useEffect(() => {
    if (total == null) return;
    let raf = 0;
    const start = performance.now();
    const dur = 1400;
    const from = 0;
    const to = total;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  return (
    <div className="sticky top-0 z-30 bg-zombie-bg/90 backdrop-blur border-b border-zombie-border px-4 py-3">
      <div className="flex items-baseline gap-2">
        <span className="inline-block w-2 h-2 rounded-full bg-zombie-accent pulse-red" aria-hidden />
        <span className="text-xs uppercase tracking-wider text-zombie-muted">
          Public dollars to organizations that vanished
        </span>
      </div>
      <div className="text-3xl sm:text-4xl font-bold tabular-nums mt-1">
        {total == null ? (
          <span className="inline-block w-48 h-8 rounded shimmer" />
        ) : (
          formatMoney(shown)
        )}
      </div>
      <div className="text-[11px] text-zombie-muted mt-1">
        Across ~852K organizations linked across federal, Alberta, and CRA charity records
      </div>
    </div>
  );
}

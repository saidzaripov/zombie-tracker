'use client';
import { useEffect, useState } from 'react';
import { Skull, Info } from 'lucide-react';
import { formatMoney } from '../lib-client/format';
import { ThemeToggle } from './ThemeToggle';

export function HeaderTicker({ onAbout }: { onAbout: () => void }) {
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
    const dur = 1600;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(total * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [total]);

  return (
    <div className="sticky top-0 z-30 bg-zombie-bg/95 backdrop-blur border-b border-zombie-border">
      <div className="relative overflow-hidden px-4 pt-4 pb-5">
        {/* radial-ish glow behind the number */}
        <div
          className="pointer-events-none absolute -inset-x-12 -top-12 h-48 opacity-40 blur-3xl"
          style={{
            background:
              'radial-gradient(60% 60% at 30% 50%, rgba(239,68,68,0.18) 0%, rgba(217,70,239,0.12) 50%, transparent 75%)',
          }}
          aria-hidden
        />

        {/* brand strip */}
        <div className="relative flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Skull
                size={18}
                className="text-zombie-accent"
                strokeWidth={2.25}
              />
              <span className="absolute -top-0.5 -right-0.5 inline-block w-1.5 h-1.5 rounded-full bg-zombie-accent pulse-red" />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-zombie-fg">
              Zombie Tracker
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-fuchsia-400/80 ml-1 px-1.5 py-0.5 rounded border border-fuchsia-500/30 bg-fuchsia-500/5">
              AI
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onAbout}
              aria-label="How this works"
              className="flex items-center gap-1 text-[11px] text-zombie-muted hover:text-zombie-fg px-2 py-1 rounded-md"
            >
              <Info size={12} />
              <span>How it works</span>
            </button>
            <ThemeToggle />
          </div>
        </div>

        {/* hero */}
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.18em] text-zombie-muted mb-1.5">
            Public dollars to Canadian charities that went silent
          </div>
          <div className="text-[44px] sm:text-[52px] leading-none font-bold tabular-nums text-zombie-fg">
            {total == null ? (
              <span className="inline-block w-56 h-12 rounded shimmer" />
            ) : (
              formatMoney(shown)
            )}
          </div>
          <div className="text-[12px] text-zombie-muted mt-2 max-w-[42ch] leading-snug">
            Federal + Alberta grants to organizations that have stopped filing,
            been dissolved, or gone fully government-funded then dark.
          </div>
        </div>
      </div>
    </div>
  );
}

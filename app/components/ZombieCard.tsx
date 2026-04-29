'use client';
import { motion } from 'framer-motion';
import { ChevronRight, Skull } from 'lucide-react';
import type { Zombie } from '@/lib/types';
import { formatMoney } from '../lib-client/format';
import { Lifeline } from './Lifeline';
import { Monogram } from './Monogram';

const SIGNAL_COLORS: Record<string, string> = {
  ab_dissolved: 'bg-red-500/15 text-red-400 border-red-500/30',
  ab_struck: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  ab_cancelled: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  stopped_filing: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  high_govt_dependency: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
};

export function ZombieCard({
  zombie,
  rank,
  onClick,
}: {
  zombie: Zombie;
  rank: number;
  onClick: () => void;
}) {
  const sources: string[] = [];
  if (zombie.fed_total > 0) sources.push('Federal');
  if (zombie.ab_total > 0) sources.push('Alberta');

  const signalClass =
    SIGNAL_COLORS[zombie.signal ?? ''] ??
    'bg-zombie-border text-zombie-muted border-zombie-border';

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onClick}
      data-signal={zombie.signal ?? ''}
      className="zt-card w-full text-left p-4"
    >
      <div className="flex items-start gap-3">
        <Monogram name={zombie.canonical_name} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wider text-zombie-muted font-mono">
                #{rank}
              </div>
              <h3 className="text-base font-semibold text-zombie-fg leading-snug line-clamp-2">
                {zombie.canonical_name}
              </h3>
            </div>
            <ChevronRight className="text-zombie-muted shrink-0 mt-1" size={18} />
          </div>
        </div>
      </div>

      <div className="flex items-baseline gap-2 mt-3">
        <span className="text-2xl font-bold tabular-nums text-zombie-fg">
          {formatMoney(zombie.total_funding, { compact: true })}
        </span>
        <span className="text-xs text-zombie-muted">total public funding</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${signalClass}`}>
          <Skull size={10} className="inline mr-1 -mt-0.5" />
          {zombie.signal_label}
        </span>
        {zombie.province && (
          <span className="text-[11px] px-2 py-0.5 rounded-full border border-zombie-border text-zombie-muted">
            {zombie.province}
          </span>
        )}
        {sources.map((s) => (
          <span
            key={s}
            className="text-[11px] px-2 py-0.5 rounded-full border border-zombie-border text-zombie-muted"
          >
            {s}
          </span>
        ))}
        {zombie.cra_govt_share_pct != null &&
          zombie.cra_govt_share_pct >= 50 &&
          zombie.signal !== 'high_govt_dependency' && (
            <span className="text-[11px] px-2 py-0.5 rounded-full border border-yellow-500/30 text-yellow-400 bg-yellow-500/10">
              {Math.round(zombie.cra_govt_share_pct)}% public revenue
            </span>
          )}
      </div>

      <Lifeline lastFiledYear={zombie.cra_latest_year} abStatus={zombie.ab_status} />
    </motion.button>
  );
}

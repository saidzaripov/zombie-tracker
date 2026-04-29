'use client';

import { X } from 'lucide-react';

export type SignalKey =
  | 'all'
  | 'dissolved'
  | 'struck'
  | 'stopped_filing'
  | 'high_dependency';

export type FilterState = {
  source: 'all' | 'fed' | 'ab';
  province: string | null;
  minFunding: number;
  signal: SignalKey;
};

const PROVINCES = ['AB', 'BC', 'ON', 'QC', 'SK', 'MB', 'NS', 'NB', 'NL', 'YT'];

export const DEFAULT_FILTER: FilterState = {
  source: 'all',
  province: null,
  minFunding: 100_000,
  signal: 'all',
};

export function FilterChips({
  state,
  onChange,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
}) {
  const hasActive =
    state.source !== 'all' ||
    state.province !== null ||
    state.minFunding !== 100_000 ||
    state.signal !== 'all';

  return (
    <div className="sticky top-[150px] z-20 bg-zombie-bg/95 backdrop-blur border-b border-zombie-border">
      <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
        {hasActive && (
          <button
            onClick={() => onChange(DEFAULT_FILTER)}
            className="shrink-0 inline-flex items-center gap-1 text-sm px-2.5 py-1.5 rounded-full border border-zombie-accent/40 bg-zombie-accent/10 text-zombie-accent hover:bg-zombie-accent/20 transition-colors"
            aria-label="Clear all filters"
          >
            <X size={12} /> Clear
          </button>
        )}

        {/* Source */}
        <Chip
          active={state.source === 'all'}
          onClick={() => onChange({ ...state, source: 'all' })}
          label="All sources"
        />
        <Chip
          active={state.source === 'fed'}
          onClick={() => onChange({ ...state, source: 'fed' })}
          label="Federal"
        />
        <Chip
          active={state.source === 'ab'}
          onClick={() => onChange({ ...state, source: 'ab' })}
          label="Alberta"
        />

        <Sep />

        {/* Signal type */}
        <Chip
          tone="signal"
          active={state.signal === 'dissolved'}
          onClick={() =>
            onChange({ ...state, signal: state.signal === 'dissolved' ? 'all' : 'dissolved' })
          }
          label="Dissolved"
        />
        <Chip
          tone="signal"
          active={state.signal === 'struck'}
          onClick={() =>
            onChange({ ...state, signal: state.signal === 'struck' ? 'all' : 'struck' })
          }
          label="Struck"
        />
        <Chip
          tone="signal"
          active={state.signal === 'stopped_filing'}
          onClick={() =>
            onChange({
              ...state,
              signal: state.signal === 'stopped_filing' ? 'all' : 'stopped_filing',
            })
          }
          label="Stopped filing"
        />
        <Chip
          tone="signal"
          active={state.signal === 'high_dependency'}
          onClick={() =>
            onChange({
              ...state,
              signal: state.signal === 'high_dependency' ? 'all' : 'high_dependency',
            })
          }
          label="100% public"
        />

        <Sep />

        {/* Min funding */}
        <Chip
          active={state.minFunding >= 1_000_000}
          onClick={() =>
            onChange({
              ...state,
              minFunding: state.minFunding >= 1_000_000 ? 100_000 : 1_000_000,
            })
          }
          label=">$1M"
        />
        <Chip
          active={state.minFunding >= 10_000_000}
          onClick={() =>
            onChange({
              ...state,
              minFunding: state.minFunding >= 10_000_000 ? 100_000 : 10_000_000,
            })
          }
          label=">$10M"
        />

        <Sep />

        {/* Province */}
        {PROVINCES.map((p) => (
          <Chip
            key={p}
            active={state.province === p}
            onClick={() => onChange({ ...state, province: state.province === p ? null : p })}
            label={p}
          />
        ))}
      </div>
    </div>
  );
}

function Sep() {
  return <span className="w-px bg-zombie-border my-1.5 mx-1" aria-hidden />;
}

function Chip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: 'signal';
}) {
  const activeClasses =
    tone === 'signal'
      ? 'bg-fuchsia-500 text-white border-fuchsia-500'
      : 'bg-zombie-accent text-white border-zombie-accent';
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? activeClasses
          : 'bg-zombie-card text-zombie-muted border-zombie-border hover:text-zombie-fg'
      }`}
    >
      {label}
    </button>
  );
}

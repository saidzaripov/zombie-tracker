'use client';

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

export function FilterChips({
  state,
  onChange,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
}) {
  return (
    <div className="sticky top-[150px] z-20 bg-zombie-bg/95 backdrop-blur border-b border-zombie-border">
      <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
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
      ? 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/40'
      : 'bg-zombie-accent text-white border-zombie-accent';
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? activeClasses
          : 'bg-zombie-card text-zombie-muted border-zombie-border hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

'use client';

export type FilterState = {
  source: 'all' | 'fed' | 'ab';
  province: string | null;
  minFunding: number;
};

const PROVINCES = ['AB', 'BC', 'ON', 'QC', 'SK', 'MB', 'NS', 'NB'];

export function FilterChips({
  state,
  onChange,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
}) {
  return (
    <div className="sticky top-[88px] z-20 bg-zombie-bg/90 backdrop-blur border-b border-zombie-border">
      <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
        <Chip
          active={state.source === 'all'}
          onClick={() => onChange({ ...state, source: 'all' })}
          label="All"
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
        <span className="w-px bg-zombie-border my-1.5 mx-1" aria-hidden />
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
        <span className="w-px bg-zombie-border my-1.5 mx-1" aria-hidden />
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

function Chip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-zombie-accent text-white border-zombie-accent'
          : 'bg-zombie-card text-zombie-muted border-zombie-border hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

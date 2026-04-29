'use client';

/**
 * Visual filing-status timeline for a charity. Shows the 5 fiscal years
 * covered by the CRA T3010 data range (2020–2024). Filled bars = years
 * for which the charity filed; faded bars = years it went silent.
 *
 * The "going dark" pattern is the entire zombie thesis — this surfaces
 * it visually on every card without needing per-card grant data.
 */
export function Lifeline({
  lastFiledYear,
  abStatus,
}: {
  lastFiledYear: number | null;
  abStatus: string | null;
}) {
  const years = [2020, 2021, 2022, 2023, 2024];
  const dead = abStatus === 'Dissolved' || abStatus === 'Struck' || abStatus === 'Cancelled';

  return (
    <div className="flex items-center gap-1.5 mt-3 select-none">
      <span className="text-[9px] uppercase tracking-wider text-zombie-muted shrink-0 mr-0.5">
        Filings
      </span>
      <div className="flex items-center gap-[3px]">
        {years.map((y) => {
          const filed = lastFiledYear !== null && y <= lastFiledYear;
          return (
            <div key={y} className="flex flex-col items-center gap-0.5">
              <div
                className={`w-3.5 h-1.5 rounded-sm ${
                  filed
                    ? dead
                      ? 'bg-orange-500/70'
                      : 'bg-emerald-500/70'
                    : 'bg-zombie-border'
                }`}
                aria-label={filed ? `${y} filed` : `${y} not filed`}
              />
              <div className="text-[8px] text-zombie-muted/70 font-mono leading-none">
                {String(y).slice(2)}
              </div>
            </div>
          );
        })}
      </div>
      {lastFiledYear && (
        <span className="text-[10px] text-zombie-muted ml-1">
          last: {lastFiledYear}
        </span>
      )}
    </div>
  );
}

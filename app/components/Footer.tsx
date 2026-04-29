export function Footer() {
  return (
    <footer className="px-4 pt-8 pb-12 mt-2 border-t border-zombie-border">
      <div className="text-[11px] leading-relaxed text-zombie-muted space-y-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-zombie-fg/90">
            Zombie Tracker
          </div>
          <div className="text-[11px] text-zombie-muted mt-0.5">
            built by{' '}
            <a
              href="https://www.linkedin.com/in/said-zaripov7/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zombie-fg/90 hover:text-zombie-fg underline-offset-2 hover:underline"
            >
              Said Zaripov
            </a>
          </div>
        </div>

        <p>
          Built solo at{' '}
          <span className="text-zombie-fg/80">Agency 2026 — Ottawa AI Hackathon</span>{' '}
          (April 29, 2026). AI for Accountability track.
        </p>

        <p>
          Data: CRA T3010 (2020–2024), Government of Canada Open Data, Alberta
          Open Data — cross-linked via the agency-26-hackathon entity-resolution
          pipeline. AI narratives by Claude Sonnet 4.6 + Haiku 4.5.
        </p>

        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
          <a
            href="https://www.linkedin.com/in/said-zaripov7/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zombie-fg underline-offset-2 hover:underline"
          >
            LinkedIn
          </a>
          <a
            href="https://github.com/saidzaripov/zombie-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zombie-fg underline-offset-2 hover:underline"
          >
            github.com/saidzaripov/zombie-tracker
          </a>
          <a
            href="https://github.com/GovAlta/agency-26-hackathon"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-zombie-fg underline-offset-2 hover:underline"
          >
            Hackathon dataset
          </a>
        </div>
      </div>
    </footer>
  );
}

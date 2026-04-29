export function Footer() {
  return (
    <footer className="px-4 pt-6 pb-10 mt-2 border-t border-zombie-border">
      <div className="text-[11px] leading-relaxed text-zombie-muted space-y-2">
        <p>
          Built by{' '}
          <a
            href="https://github.com/saidzaripov"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-300 hover:text-white underline-offset-2 hover:underline"
          >
            Said Zaripov
          </a>{' '}
          during{' '}
          <span className="text-neutral-300">Agency 2026 — Ottawa AI Hackathon</span>.
        </p>
        <p>
          Data: CRA T3010 (2020–2024), Government of Canada Open Data, Alberta Open Data —
          cross-linked via the agency-26-hackathon entity-resolution pipeline. AI narratives by
          Claude Sonnet 4.6.
        </p>
        <p className="text-zombie-muted/70">
          Source code:{' '}
          <a
            href="https://github.com/saidzaripov/zombie-tracker"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white underline-offset-2 hover:underline"
          >
            github.com/saidzaripov/zombie-tracker
          </a>
        </p>
      </div>
    </footer>
  );
}

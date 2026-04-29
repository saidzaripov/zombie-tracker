'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Sparkles, Building2, Calendar, ScanSearch } from 'lucide-react';
import { formatMoney, shortDate } from '../lib-client/format';

type AgentCandidate = {
  entity_id: number;
  name: string;
  province: string | null;
  total_funding: number;
  fed_total: number;
  ab_total: number;
  cra_govt_share_pct: number | null;
  cra_latest_year: number | null;
  fed_latest_grant: string | null;
  ab_registry_status: string | null;
  signal_label: string;
  top_grants: Array<{
    source: string;
    amount: number;
    date: string | null;
    department: string | null;
    purpose: string | null;
  }>;
};

type SelectionEvent = {
  entity_id: number;
  headline: string;
  candidate: AgentCandidate;
};

type StartEvent = {
  candidates: number;
  snapshot_date?: string;
  names?: Array<{
    entity_id: number;
    name: string;
    province: string | null;
    total_funding: number;
  }>;
};

export function AgentSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <AnimatePresence>{open && <AgentInner onClose={onClose} />}</AnimatePresence>;
}

function parseSections(text: string) {
  const reasoningMatch = text.match(/<reasoning>([\s\S]*?)(?:<\/reasoning>|$)/);
  const narrativeMatch = text.match(/<narrative>([\s\S]*?)(?:<\/narrative>|$)/);
  const flagsMatch = text.match(/<red_flags>([\s\S]*?)(?:<\/red_flags>|$)/);
  const reasoning = reasoningMatch ? reasoningMatch[1].trim() : '';
  const narrative = narrativeMatch ? narrativeMatch[1].trim() : '';
  const flagsRaw = flagsMatch ? flagsMatch[1].trim() : '';
  const flags = flagsRaw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('-'))
    .map((l) => l.replace(/^-\s*/, ''));
  return { reasoning, narrative, flags };
}

function AgentInner({ onClose }: { onClose: () => void }) {
  const [selection, setSelection] = useState<SelectionEvent | null>(null);
  const [start, setStart] = useState<StartEvent | null>(null);
  const [narrativeRaw, setNarrativeRaw] = useState('');
  const [streaming, setStreaming] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<'reviewing' | 'selected' | 'writing' | 'done'>('reviewing');

  useEffect(() => {
    let cancelled = false;
    setSelection(null);
    setNarrativeRaw('');
    setStreaming(true);
    setError(null);
    setPhase('reviewing');

    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/agent/investigate`, { signal: ctrl.signal });
        if (!res.ok || !res.body) {
          setError(await res.text());
          setStreaming(false);
          return;
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';
          for (const block of events) {
            const lines = block.split('\n');
            const eventLine = lines.find((l) => l.startsWith('event: '));
            const dataLine = lines.find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            const eventName = eventLine?.slice(7);
            try {
              const payload = JSON.parse(dataLine.slice(6));
              if (eventName === 'start') {
                setStart(payload);
              } else if (eventName === 'selection') {
                setSelection(payload);
                setPhase('writing');
              } else if (eventName === 'delta') {
                setNarrativeRaw((prev) => prev + (payload.text ?? ''));
              } else if (eventName === 'done') {
                setPhase('done');
              } else if (eventName === 'error') {
                setError(payload.message);
              }
            } catch {}
          }
        }
        setStreaming(false);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message);
        setStreaming(false);
      }
    })();

    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, []);

  const { reasoning, narrative, flags } = useMemo(() => parseSections(narrativeRaw), [narrativeRaw]);

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="absolute inset-x-0 bottom-0 top-6 sm:top-12 bg-zombie-bg border-t border-zombie-border rounded-t-2xl overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zombie-border shrink-0">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-fuchsia-400 font-semibold flex items-center gap-1.5">
              <Sparkles size={12} /> Autonomous Investigation
            </div>
            <h2 className="text-lg font-semibold text-zombie-fg truncate">
              {selection ? selection.candidate.name : 'AI is reviewing candidates…'}
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 text-zombie-muted hover:text-zombie-fg"
          >
            <X size={22} />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4 flex-1">
          {!selection && !error && <ReviewingState start={start} />}

          {error && (
            <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
              <div className="font-semibold mb-1">Investigation failed</div>
              <div>{error}</div>
            </div>
          )}

          {selection && (
            <>
              <SelectionCard selection={selection} reasoning={reasoning} />

              <Section title="AI Investigation" subtitle={streaming ? 'Writing now…' : null}>
                <div className="text-[15px] leading-relaxed text-zombie-fg whitespace-pre-wrap">
                  {narrative ||
                    (streaming ? (
                      <span className="text-zombie-muted">Generating forensic narrative…</span>
                    ) : null)}
                  {streaming && narrative && (
                    <span className="inline-block w-2 h-4 -mb-0.5 ml-0.5 bg-zombie-accent animate-pulse" />
                  )}
                </div>
                {flags.length > 0 && (
                  <div className="mt-4">
                    <div className="text-xs uppercase tracking-wider text-zombie-accent font-semibold mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> Red flags
                    </div>
                    <ul className="space-y-1.5">
                      {flags.map((f, i) => (
                        <li key={i} className="text-sm text-zombie-fg flex gap-2">
                          <span className="text-zombie-accent shrink-0">▸</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Section>

              {selection.candidate.top_grants && selection.candidate.top_grants.length > 0 && (
                <Section title="Largest grant on record">
                  <div className="space-y-2">
                    {selection.candidate.top_grants.map((g, i) => (
                      <div
                        key={i}
                        className="bg-zombie-card border border-zombie-border rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base font-semibold tabular-nums">
                            {formatMoney(g.amount)}
                          </span>
                          <span className="text-[11px] uppercase tracking-wider text-zombie-muted">
                            {g.source}
                          </span>
                        </div>
                        {g.department && (
                          <div className="text-xs text-zombie-muted mt-1 flex items-center gap-1.5">
                            <Building2 size={12} /> {g.department}
                          </div>
                        )}
                        {g.purpose && (
                          <div className="text-sm text-zombie-fg mt-1 line-clamp-2">
                            {g.purpose}
                          </div>
                        )}
                        {g.date && (
                          <div className="text-xs text-zombie-muted mt-1 flex items-center gap-1.5">
                            <Calendar size={12} /> {shortDate(g.date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              <div className="text-[10px] text-zombie-muted leading-relaxed pt-2 border-t border-zombie-border">
                The AI autonomously selected this case from 30 candidates. Picker, narrative,
                and red-flag identification all by Claude Sonnet 4.6 — the data layer made no
                pre-selection beyond the deterministic "ceased operations" filter.
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReviewingState({ start }: { start: StartEvent | null }) {
  const names = start?.names ?? [];
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    if (names.length === 0) return;
    const t = setInterval(() => setCursor((c) => (c + 1) % names.length), 380);
    return () => clearInterval(t);
  }, [names.length]);

  const current = names[cursor];

  return (
    <div className="space-y-4">
      <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-4">
        <div className="flex items-center gap-2 text-fuchsia-500 text-sm font-semibold mb-3">
          <ScanSearch size={14} className="animate-pulse" />
          AI is reviewing candidate organizations…
        </div>

        {names.length > 0 && current ? (
          <div className="space-y-3">
            <div className="text-[11px] uppercase tracking-wider text-fuchsia-500/70 font-mono">
              Reading candidate {cursor + 1} of {names.length}
            </div>
            <div className="bg-zombie-bg/60 border border-fuchsia-500/20 rounded-lg p-3 transition-all duration-200">
              <div className="text-base font-semibold text-zombie-fg truncate">
                {current.name}
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-zombie-muted">
                <span className="font-mono text-fuchsia-500/80">
                  {current.province ?? '—'}
                </span>
                <span>·</span>
                <span className="tabular-nums">
                  ${(current.total_funding / 1e6).toFixed(1)}M public funding
                </span>
              </div>
            </div>

            <div className="grid grid-cols-8 gap-1">
              {names.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-colors ${
                    i <= cursor ? 'bg-fuchsia-500' : 'bg-zombie-border'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-zombie-muted leading-relaxed">
            The model is reading each candidate's funding totals, signal types,
            government-revenue dependency, last-filing year, and Alberta registry status — and
            choosing the one with the most striking accountability story.
          </div>
        )}
      </div>

      <div className="text-[11px] text-zombie-muted leading-relaxed">
        Selection is not pre-coded. The deterministic filter narrows ~852K
        organizations down to a candidate slate; the model picks one
        autonomously and explains why.
      </div>
    </div>
  );
}

function SelectionCard({
  selection,
  reasoning,
}: {
  selection: SelectionEvent;
  reasoning: string;
}) {
  const c = selection.candidate;
  return (
    <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-4 space-y-3">
      <div>
        <div className="text-[10px] uppercase tracking-wider text-fuchsia-400 font-semibold mb-1 flex items-center gap-1">
          <Sparkles size={10} /> AI selected
        </div>
        <h3 className="text-base font-semibold text-zombie-fg">{selection.headline}</h3>
      </div>
      {reasoning && (
        <div className="text-[13px] leading-relaxed text-zombie-fg/85 italic border-l-2 border-fuchsia-500/50 pl-3">
          {reasoning}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <Stat
          label="Total public $"
          value={formatMoney(c.total_funding, { compact: true })}
          accent
        />
        <Stat label="Federal" value={formatMoney(c.fed_total, { compact: true })} />
        <Stat label="Alberta" value={formatMoney(c.ab_total, { compact: true })} />
        <Stat
          label="Last T3010 filed"
          value={c.cra_latest_year ? String(c.cra_latest_year) : '—'}
        />
        {c.cra_govt_share_pct != null && (
          <Stat
            label="Public share of revenue"
            value={`${Math.round(c.cra_govt_share_pct)}%`}
          />
        )}
        {c.ab_registry_status && (
          <Stat label="AB registry" value={c.ab_registry_status} />
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-zombie-card border border-zombie-border rounded-lg p-2.5">
      <div className="text-[10px] uppercase tracking-wider text-zombie-muted">{label}</div>
      <div
        className={`text-sm font-semibold mt-0.5 tabular-nums ${
          accent ? 'text-zombie-accent' : 'text-zombie-fg'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-baseline gap-2 mb-2">
        <h3 className="text-sm font-semibold text-zombie-fg uppercase tracking-wider">{title}</h3>
        {subtitle && <span className="text-xs text-zombie-muted">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

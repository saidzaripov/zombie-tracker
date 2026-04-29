'use client';
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Building2, Calendar, Share2, Check } from 'lucide-react';
import type { Zombie, DossierData } from '@/lib/types';
import { formatMoney, shortDate } from '../lib-client/format';

export function DossierSheet({
  zombie,
  onClose,
}: {
  zombie: Zombie | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {zombie && <DossierInner key={zombie.entity_id} zombie={zombie} onClose={onClose} />}
    </AnimatePresence>
  );
}

function parseSections(text: string) {
  const narrativeMatch = text.match(/<narrative>([\s\S]*?)(?:<\/narrative>|$)/);
  const flagsMatch = text.match(/<red_flags>([\s\S]*?)(?:<\/red_flags>|$)/);
  const narrative = narrativeMatch ? narrativeMatch[1].trim() : text.trim();
  const flagsRaw = flagsMatch ? flagsMatch[1].trim() : '';
  const flags = flagsRaw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('-'))
    .map((l) => l.replace(/^-\s*/, ''));
  return { narrative, flags };
}

function DossierInner({ zombie, onClose }: { zombie: Zombie; onClose: () => void }) {
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [narrativeRaw, setNarrativeRaw] = useState('');
  const [streaming, setStreaming] = useState(true);
  const [streamError, setStreamError] = useState<string | null>(null);

  // load dossier data
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/zombies/${zombie.entity_id}/dossier`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setDossier(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [zombie.entity_id]);

  // stream narrative
  useEffect(() => {
    let cancelled = false;
    setNarrativeRaw('');
    setStreaming(true);
    setStreamError(null);

    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/zombies/${zombie.entity_id}/narrative`, {
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          setStreamError(await res.text());
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
            try {
              const payload = JSON.parse(dataLine.slice(6));
              const eventName = eventLine?.slice(7);
              if (eventName === 'delta') {
                setNarrativeRaw((prev) => prev + (payload.text ?? ''));
              } else if (eventName === 'error') {
                setStreamError(payload.message);
              }
            } catch {}
          }
        }
        setStreaming(false);
      } catch (e: any) {
        if (e.name !== 'AbortError') setStreamError(e.message);
        setStreaming(false);
      }
    })();

    return () => { cancelled = true; ctrl.abort(); };
  }, [zombie.entity_id]);

  const { narrative, flags } = useMemo(() => parseSections(narrativeRaw), [narrativeRaw]);

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-zombie-border shrink-0 gap-2">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-zombie-accent font-semibold">
              Forensic Dossier
            </div>
            <h2 className="text-lg font-semibold text-white truncate">{zombie.canonical_name}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <ShareButton zombie={zombie} narrative={narrative} />
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 -mr-2 text-zombie-muted hover:text-white"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-4 py-4 space-y-4 flex-1">
          <Stats zombie={zombie} dossier={dossier} />

          <Section title="AI Investigation" subtitle={streaming ? 'Writing now…' : null}>
            {streamError && (
              <div className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
                {streamError.includes('ANTHROPIC_API_KEY')
                  ? 'Set ANTHROPIC_API_KEY in .env.local and restart the dev server.'
                  : streamError}
              </div>
            )}
            {!streamError && (
              <div className="text-[15px] leading-relaxed text-neutral-200 whitespace-pre-wrap">
                {narrative || (streaming ? <span className="text-zombie-muted">Connecting to model…</span> : null)}
                {streaming && narrative && <span className="inline-block w-2 h-4 -mb-0.5 ml-0.5 bg-zombie-accent animate-pulse" />}
              </div>
            )}
            {flags.length > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-zombie-accent font-semibold mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Red flags
                </div>
                <ul className="space-y-1.5">
                  {flags.map((f, i) => (
                    <li key={i} className="text-sm text-neutral-300 flex gap-2">
                      <span className="text-zombie-accent shrink-0">▸</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section title="Top grants">
            {dossier?.topGrants?.length ? (
              <div className="space-y-2">
                {dossier.topGrants.map((g, i) => (
                  <div key={i} className="bg-zombie-card border border-zombie-border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold tabular-nums">{formatMoney(g.amount)}</span>
                      <span className="text-[11px] uppercase tracking-wider text-zombie-muted">{g.source}</span>
                    </div>
                    {g.department && (
                      <div className="text-xs text-zombie-muted mt-1 flex items-center gap-1.5">
                        <Building2 size={12} /> {g.department}
                      </div>
                    )}
                    {g.purpose && <div className="text-sm text-neutral-300 mt-1 line-clamp-2">{g.purpose}</div>}
                    {g.date && (
                      <div className="text-xs text-zombie-muted mt-1 flex items-center gap-1.5">
                        <Calendar size={12} /> {shortDate(g.date)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-zombie-muted">No itemized grant records linked to this entity.</div>
            )}
          </Section>

          <div className="text-[10px] text-zombie-muted leading-relaxed pt-2 border-t border-zombie-border">
            Source: CRA T3010 (2020–2024), Government of Canada Open Data, Alberta Open Data. Cross-linked
            via the agency-26-hackathon entity-resolution pipeline. Narrative generated by Claude Sonnet 4.6.
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ShareButton({ zombie, narrative }: { zombie: Zombie; narrative: string }) {
  const [copied, setCopied] = useState(false);

  const onShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const headline = `${zombie.canonical_name} — ${formatMoney(zombie.total_funding, { compact: true })} in public funding`;
    const teaser = narrative ? narrative.split('\n')[0].slice(0, 240) : zombie.signal_label;
    const shareData = {
      title: headline,
      text: `${headline}\n\n${teaser}\n\nFrom Zombie Tracker — Canada's $1.5B accountability gap.`,
      url,
    };
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as any).share(shareData);
        return;
      }
    } catch {
      /* user cancelled or share failed — fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(`${shareData.text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* nothing to do */
    }
  };

  return (
    <button
      onClick={onShare}
      aria-label="Share this dossier"
      className="p-2 text-zombie-muted hover:text-white"
    >
      {copied ? <Check size={18} className="text-emerald-400" /> : <Share2 size={18} />}
    </button>
  );
}

function Stats({ zombie, dossier }: { zombie: Zombie; dossier: DossierData | null }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Stat label="Total public $" value={formatMoney(zombie.total_funding, { compact: true })} accent />
      <Stat label="Federal" value={formatMoney(zombie.fed_total, { compact: true })} />
      <Stat label="Alberta" value={formatMoney(zombie.ab_total, { compact: true })} />
      <Stat
        label="Last T3010 filed"
        value={zombie.cra_latest_year ? String(zombie.cra_latest_year) : '—'}
      />
      {zombie.cra_govt_share_pct != null && (
        <Stat
          label="Public share of revenue"
          value={`${Math.round(zombie.cra_govt_share_pct)}%`}
        />
      )}
      {zombie.ab_status && <Stat label="AB registry" value={zombie.ab_status} />}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-zombie-card border border-zombie-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-zombie-muted">{label}</div>
      <div className={`text-lg font-semibold mt-0.5 tabular-nums ${accent ? 'text-zombie-accent' : 'text-white'}`}>
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
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h3>
        {subtitle && <span className="text-xs text-zombie-muted">{subtitle}</span>}
      </div>
      {children}
    </section>
  );
}

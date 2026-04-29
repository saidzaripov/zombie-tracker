'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Database, Sparkles, Filter, ShieldCheck } from 'lucide-react';

export function MethodologySheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
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
              <div>
                <div className="text-xs uppercase tracking-wider text-zombie-accent font-semibold">
                  How it works
                </div>
                <h2 className="text-lg font-semibold text-white">
                  Methodology · data · trade-offs
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 -mr-2 text-zombie-muted hover:text-white"
              >
                <X size={22} />
              </button>
            </div>

            <div className="overflow-y-auto px-4 py-5 space-y-6 flex-1">
              <Section
                icon={<Filter size={14} />}
                title="The question"
              >
                <p>
                  When public dollars go to a charity that disappears shortly
                  after, did the public get what it paid for?
                </p>
                <p className="mt-2">
                  Zombie Tracker flags Canadian organizations that received
                  $100K+ in public funding AND show clear signs of having
                  ceased meaningful operations. The headline number on the
                  home screen is the cumulative funding to the full set.
                </p>
              </Section>

              <Section icon={<ShieldCheck size={14} />} title="Definition (defensible, narrow)">
                <p>An organization is flagged if all of the following hold:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-1.5">
                  <li>Received ≥ $100,000 across federal + Alberta sources.</li>
                  <li>
                    Triggers at least one ceased-operations signal:
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>
                        Alberta non-profit registration is{' '}
                        <em>Dissolved</em>, <em>Struck</em>,{' '}
                        <em>Cancelled</em>, or similar (Alberta-native types
                        only — Extra-Provincial registrations are excluded).
                      </li>
                      <li>
                        Last filed CRA T3010 charity return is from 2022 or
                        earlier (the data range is 2020–2024, so this means
                        at least 2 consecutive years of non-filing).
                      </li>
                      <li>
                        Government revenue share ≥ 70% in last filed year AND
                        last filed ≤ 2022 (heavy public dependency, then
                        silent).
                      </li>
                    </ul>
                  </li>
                  <li>
                    Is <em>not</em> currently active: hasn't filed in 2024 and
                    hasn't received a federal grant in the past 12 months.
                  </li>
                  <li>Is not a government entity (province, municipality, city).</li>
                </ol>
                <p className="mt-3 text-zombie-muted">
                  The first version of this query flagged <strong>$12.2 billion</strong>.
                  Most were active hospitals or merged regional health
                  authorities. Iterative tightening (Alberta-native types only,
                  active-org exclusions, govt-entity exclusions) brought the
                  number to <strong>$1.5 billion</strong> — smaller, but every
                  dollar maps to a specific row a journalist can verify.
                </p>
              </Section>

              <Section icon={<Database size={14} />} title="Data sources">
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>CRA T3010 Charity Filings (2020–2024)</strong> — ~7.3M raw
                    filings + 1.4M pre-computed analysis rows, ~85,000 charities.
                  </li>
                  <li>
                    <strong>Federal Grants & Contributions (2006–2025)</strong> — ~1.28M
                    agreements from 51+ federal departments.
                  </li>
                  <li>
                    <strong>Alberta Open Data (2014–2026)</strong> — ~2M provincial
                    grants, contracts, sole-source, non-profit registry.
                  </li>
                  <li>
                    <strong>Cross-dataset entity resolution</strong> — 851,300 canonical
                    organizations linking the same org across all three datasets,
                    from the GovAlta agency-26-hackathon pipeline.
                  </li>
                </ul>
                <p className="mt-2 text-zombie-muted">
                  All data redistributed under the Open Government Licence
                  (Canada and Alberta). The cross-dataset linking is what
                  makes the same charity findable under federal name vs. Alberta
                  registry name vs. CRA legal name.
                </p>
              </Section>

              <Section icon={<Sparkles size={14} />} title="How the AI is used">
                <p>
                  Two distinct AI roles, both Claude (Sonnet 4.6 + Haiku 4.5):
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-2">
                  <li>
                    <strong>Per-card forensic dossier (tap any zombie):</strong>
                    The model receives a structured JSON of the entity's
                    funding, top grants, and last-filed financials, then
                    streams a 200-word CBC-style narrative + 3-5 red flags.
                    It cannot use any number, name, or date that isn't in the
                    JSON — no free-text retrieval, no hallucination surface.
                  </li>
                  <li>
                    <strong>Autonomous investigator (the &ldquo;Let the AI investigate&rdquo; button):</strong>
                    The model receives a slate of candidate zombies and
                    autonomously picks one — explaining why, then writing the
                    case. The selection logic is not pre-coded; the model
                    decides which case is the most teachable accountability
                    story. This is the agent autonomy the criteria reward.
                  </li>
                </ul>
              </Section>

              <Section title="Trade-offs we named">
                <ul className="list-disc pl-5 space-y-2">
                  <li>
                    <strong>Precision over recall.</strong> Excluding Alberta
                    Extra-Provincial registrations probably hides 20-30 real
                    zombies that operate nationally. We chose fewer false
                    positives.
                  </li>
                  <li>
                    <strong>Five-year window.</strong> CRA T3010 data only
                    covers 2020-2024, so anything that disappeared earlier is
                    invisible.
                  </li>
                  <li>
                    <strong>Snapshot mode.</strong> When the shared hackathon
                    DB is throttled (4+ minute query times under load), the
                    feed falls back to a deploy-time snapshot. The agent
                    endpoint and per-card AI dossier are unaffected.
                  </li>
                  <li>
                    <strong>Mobile-first deployment.</strong> Optimized for a
                    citizen on a phone, not a journalist on a laptop. A power
                    user would want export, multi-select, and BN-search;
                    those would be the next features.
                  </li>
                </ul>
              </Section>

              <Section title="What's next">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Real-time alerts when a recipient stops filing.</li>
                  <li>Provincial coverage beyond Alberta (Ontario, BC, QC).</li>
                  <li>Direct journalist hand-off via FOI templates.</li>
                  <li>Public read-only API for civic researchers.</li>
                </ul>
              </Section>

              <div className="text-[10px] text-zombie-muted pt-2 border-t border-zombie-border">
                Built solo by Said Zaripov for the Agency 2026 — Ottawa AI
                Hackathon (April 29, 2026). Source: github.com/saidzaripov/zombie-tracker.
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="text-[14px] leading-relaxed text-neutral-200">
      <h3 className="text-xs uppercase tracking-wider text-white font-semibold mb-2 flex items-center gap-1.5">
        {icon && <span className="text-zombie-accent">{icon}</span>}
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

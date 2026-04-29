'use client';
import { useEffect, useState } from 'react';
import { ZombieCard } from './ZombieCard';
import { DossierSheet } from './DossierSheet';
import { FilterChips, type FilterState } from './FilterChips';
import { AgentButton } from './AgentButton';
import { AgentSheet } from './AgentSheet';
import type { Zombie } from '@/lib/types';

export function ZombieFeed() {
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Zombie | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [filter, setFilter] = useState<FilterState>({
    source: 'all',
    province: null,
    minFunding: 100_000,
  });

  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filter.source !== 'all') params.set('source', filter.source);
    if (filter.province) params.set('province', filter.province);
    params.set('minFunding', String(filter.minFunding));
    params.set('limit', '100');

    const ctrl = new AbortController();
    fetch(`/api/zombies?${params.toString()}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setZombies(d.zombies ?? []);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => ctrl.abort();
  }, [filter]);

  return (
    <>
      <FilterChips state={filter} onChange={setFilter} />
      <AgentButton onClick={() => setAgentOpen(true)} />

      <div className="px-4 py-3 space-y-2 pb-24">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-32 rounded-xl shimmer" />
            ))}
          </div>
        )}
        {error && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-300">
            <div className="font-semibold mb-1">Could not load data</div>
            <div className="text-amber-300/80">{error}</div>
          </div>
        )}
        {!loading && !error && zombies.length === 0 && (
          <div className="text-center py-12 text-zombie-muted">No zombies match these filters.</div>
        )}
        {!loading &&
          zombies.map((z, i) => (
            <ZombieCard key={z.entity_id} zombie={z} rank={i + 1} onClick={() => setSelected(z)} />
          ))}
      </div>

      <DossierSheet zombie={selected} onClose={() => setSelected(null)} />
      <AgentSheet open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}

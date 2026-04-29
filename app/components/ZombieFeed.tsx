'use client';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ZombieCard } from './ZombieCard';
import { DossierSheet } from './DossierSheet';
import { FilterChips, DEFAULT_FILTER, type FilterState } from './FilterChips';
import { AgentButton } from './AgentButton';
import { AgentSheet } from './AgentSheet';
import { SearchBar } from './SearchBar';
import { SnapshotBadge } from './SnapshotBadge';
import type { Zombie } from '@/lib/types';

const PAGE_SIZE = 12;

export function ZombieFeed() {
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [src, setSrc] = useState<'live' | 'snapshot' | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Zombie | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pageCount, setPageCount] = useState(1);
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPageCount(1);
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
        else {
          setZombies(d.zombies ?? []);
          setSrc(d.src ?? null);
        }
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

  // Reset to page 1 when search changes
  useEffect(() => {
    setPageCount(1);
  }, [search]);

  const filtered = useMemo(() => {
    let list = zombies;

    // Signal filter
    if (filter.signal !== 'all') {
      list = list.filter((z) => {
        if (filter.signal === 'dissolved') return z.signal === 'ab_dissolved';
        if (filter.signal === 'struck') return z.signal === 'ab_struck';
        if (filter.signal === 'stopped_filing') return z.signal === 'stopped_filing';
        if (filter.signal === 'high_dependency')
          return z.signal === 'high_govt_dependency' ||
            (z.cra_govt_share_pct != null && z.cra_govt_share_pct >= 95);
        return true;
      });
    }

    // Search
    const needle = search.trim().toLowerCase();
    if (needle) {
      list = list.filter(
        (z) =>
          z.canonical_name.toLowerCase().includes(needle) ||
          (z.bn_root && z.bn_root.includes(needle)) ||
          (z.province && z.province.toLowerCase() === needle)
      );
    }

    return list;
  }, [zombies, search, filter.signal]);

  const visible = filtered.slice(0, pageCount * PAGE_SIZE);
  const hasMore = filtered.length > visible.length;

  return (
    <>
      <FilterChips state={filter} onChange={setFilter} />
      <SearchBar value={search} onChange={setSearch} />
      <SnapshotBadge src={src} />
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
        {!loading && !error && visible.length === 0 && (
          <div className="text-center py-12">
            <div className="text-zombie-muted">
              {search ? `No matches for "${search}".` : 'No zombies match these filters.'}
            </div>
          </div>
        )}
        {!loading &&
          visible.map((z, i) => (
            <ZombieCard
              key={z.entity_id}
              zombie={z}
              rank={i + 1}
              onClick={() => setSelected(z)}
            />
          ))}

        {!loading && !error && hasMore && (
          <button
            onClick={() => setPageCount((p) => p + 1)}
            className="w-full mt-2 flex items-center justify-center gap-2 bg-zombie-card border border-zombie-border rounded-xl py-3 text-sm text-zombie-muted hover:text-white active:scale-[0.99] transition-transform"
          >
            <ChevronDown size={16} />
            Show next {Math.min(PAGE_SIZE, filtered.length - visible.length)} of{' '}
            {filtered.length - visible.length} more
          </button>
        )}

        {!loading && !error && !hasMore && filtered.length > PAGE_SIZE && (
          <div className="text-center text-[11px] text-zombie-muted pt-2">
            End of list — {filtered.length} organizations
          </div>
        )}
      </div>

      <DossierSheet zombie={selected} onClose={() => setSelected(null)} />
      <AgentSheet open={agentOpen} onClose={() => setAgentOpen(false)} />
    </>
  );
}

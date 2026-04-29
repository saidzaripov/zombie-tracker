'use client';
import { Search, X } from 'lucide-react';

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="px-4 pt-2">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zombie-muted pointer-events-none"
        />
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search a charity by name…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-zombie-card border border-zombie-border rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-zombie-muted focus:outline-none focus:border-zombie-accent/60"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zombie-muted hover:text-white"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

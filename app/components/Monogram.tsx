'use client';

/**
 * Deterministic colored monogram for an organization.
 * Same name → same color, every render. Pulls 1-2 letters from the name.
 */
const PALETTE = [
  { bg: 'bg-rose-500/15', ring: 'ring-rose-500/30', text: 'text-rose-300' },
  { bg: 'bg-amber-500/15', ring: 'ring-amber-500/30', text: 'text-amber-300' },
  { bg: 'bg-emerald-500/15', ring: 'ring-emerald-500/30', text: 'text-emerald-300' },
  { bg: 'bg-sky-500/15', ring: 'ring-sky-500/30', text: 'text-sky-300' },
  { bg: 'bg-indigo-500/15', ring: 'ring-indigo-500/30', text: 'text-indigo-300' },
  { bg: 'bg-fuchsia-500/15', ring: 'ring-fuchsia-500/30', text: 'text-fuchsia-300' },
  { bg: 'bg-orange-500/15', ring: 'ring-orange-500/30', text: 'text-orange-300' },
  { bg: 'bg-teal-500/15', ring: 'ring-teal-500/30', text: 'text-teal-300' },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  // Strip leading "The ", then take 1st char of first 2 meaningful words
  const cleaned = name.replace(/^the\s+/i, '').trim();
  const words = cleaned.split(/[\s\-—,]+/).filter((w) => w.length > 0 && !/^(of|and|for|inc\.?|ltd\.?)$/i.test(w));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function Monogram({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const palette = PALETTE[hash(name) % PALETTE.length];
  const cls = size === 'sm' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs';
  return (
    <div
      className={`shrink-0 rounded-lg ring-1 flex items-center justify-center font-mono font-semibold tracking-wider ${cls} ${palette.bg} ${palette.ring} ${palette.text}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

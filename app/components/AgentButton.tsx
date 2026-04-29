'use client';
import { Sparkles } from 'lucide-react';

export function AgentButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="px-4 pt-3 pb-1">
      <button
        onClick={onClick}
        className="w-full flex items-center justify-between gap-3 rounded-xl border border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500/10 to-purple-500/10 px-4 py-3 active:scale-[0.99] transition-transform"
      >
        <div className="flex items-center gap-3 text-left">
          <div className="rounded-full bg-fuchsia-500/20 p-2">
            <Sparkles size={16} className="text-fuchsia-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zombie-fg">Let the AI investigate</div>
            <div className="text-[11px] text-zombie-muted leading-tight">
              Pick a candidate, explain why, write the case
            </div>
          </div>
        </div>
        <div className="text-fuchsia-500 text-xs uppercase tracking-wider font-semibold">
          Run
        </div>
      </button>
    </div>
  );
}

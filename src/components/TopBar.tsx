import { motion } from 'framer-motion';
import { Moon, Play, RotateCcw, Sun } from 'lucide-react';
import { useSim, type Mode } from '../sim/store';
import { useDirector } from '../sim/director';
import { LogoMark, Wordmark } from './Logo';

export function ModeToggle() {
  const mode = useSim((s) => s.mode);
  const setMode = useSim((s) => s.setMode);
  const opts: { id: Mode; label: string; short: string }[] = [
    { id: 'overview', label: 'Overview', short: 'Overview' },
    { id: 'tech', label: 'Under the hood', short: 'The tech' },
  ];
  return (
    <div role="tablist" aria-label="Presentation mode" className="relative flex rounded-full border border-line-2 bg-surface-2 p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={mode === o.id}
          onClick={() => setMode(o.id)}
          className={`relative z-10 whitespace-nowrap rounded-full px-3 py-1.5 text-[15px] font-semibold transition-colors sm:px-5 ${mode === o.id ? 'text-paper' : 'text-ink-2 hover:text-ink'}`}
        >
          {mode === o.id && <motion.span layoutId="mode-pill" className="absolute inset-0 -z-10 rounded-full bg-ink" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
          <span className="hidden sm:inline">{o.label}</span>
          <span className="sm:hidden">{o.short}</span>
        </button>
      ))}
    </div>
  );
}

export function TopBar() {
  const reset = useSim((s) => s.reset);
  const theme = useSim((s) => s.theme);
  const toggleTheme = useSim((s) => s.toggleTheme);
  const start = useDirector((s) => s.start);
  const active = useDirector((s) => s.active);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-[68px] max-w-[1600px] items-center gap-2 px-3 sm:gap-3 md:px-6">
        <a href="?mode=overview" onClick={(e) => { e.preventDefault(); useSim.getState().setMode('overview'); window.scrollTo({ top: 0 }); }} className="shrink-0" aria-label="LedgerHound home">
          <span className="hidden sm:inline"><Wordmark /></span>
          <span className="sm:hidden"><LogoMark /></span>
        </a>
        <div className="flex flex-1 justify-center">
          <ModeToggle />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="group relative hidden lg:inline-flex">
            <span tabIndex={0} className="cursor-help rounded-full border border-dashed border-line-2 px-3 py-1 text-[14px] font-medium text-muted">Simulated demo · real SHA-256</span>
            <span role="tooltip" className="pointer-events-none absolute right-0 top-full mt-2 w-80 rounded-xl bg-ink p-3.5 text-[14px] leading-snug text-paper opacity-0 shadow-xl transition group-focus-within:opacity-100 group-hover:opacity-100">
              TripGrid, its data, the agents and the blockchain are simulated in your browser. The cryptography is real: every hash is SHA-256 via WebCrypto, so every root, proof and chain link on screen can be checked.
            </span>
          </span>
          <button
            onClick={start}
            disabled={active}
            className="hidden items-center gap-2 rounded-full bg-accent px-4 py-2 text-[15px] font-semibold text-white transition hover:brightness-110 active:scale-[0.97] disabled:opacity-50 md:inline-flex"
          >
            <Play className="size-4 fill-current" aria-hidden /> Run full demo
          </button>
          <button onClick={start} disabled={active} aria-label="Run full demo" className="grid size-10 place-items-center rounded-full bg-accent text-white md:hidden">
            <Play className="size-4 fill-current" aria-hidden />
          </button>
          <button onClick={() => void reset()} aria-label="Reset simulation" title="Reset (R)" className="grid size-10 place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition hover:border-ink hover:text-ink">
            <RotateCcw className="size-4" aria-hidden />
          </button>
          <button onClick={toggleTheme} aria-label="Toggle dark theme" className="hidden size-10 place-items-center rounded-full border border-line-2 bg-surface text-ink-2 transition hover:border-ink sm:grid">
            {theme === 'light' ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
          </button>
        </div>
      </div>
    </header>
  );
}

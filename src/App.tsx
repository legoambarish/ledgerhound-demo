import { lazy, Suspense, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useSim } from './sim/store';
import { useDirector } from './sim/director';
import { TopBar } from './components/TopBar';
import { StatusPill } from './components/StatusPill';
import { DirectorBar } from './components/DirectorBar';
import { Overview } from './modes/overview/Overview';
const Technical = lazy(() => import('./modes/technical/Technical').then((m) => ({ default: m.Technical })));

export default function App() {
  const mode = useSim((s) => s.mode);
  const section = useSim((s) => s.section);
  const theme = useSim((s) => s.theme);
  const reduce = useReducedMotion();

  useEffect(() => {
    void useSim.getState().init();
  }, []);

  // theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // URL state: ?mode=overview|tech&section=t5
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    p.set('mode', mode);
    if (mode === 'tech') p.set('section', section);
    else p.delete('section');
    const url = `${window.location.pathname}?${p.toString()}`;
    if (url !== window.location.pathname + window.location.search) window.history.replaceState(null, '', url);
  }, [mode, section]);

  useEffect(() => {
    const onPop = () => {
      const p = new URLSearchParams(window.location.search);
      useSim.setState({ mode: p.get('mode') === 'tech' ? 'tech' : 'overview', section: p.get('section') ?? 't1' });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // scroll to top on mode change (unless the director is driving overview scroll)
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [mode]);

  // keyboard: T toggles mode, Space pause/resume autoplay, ←/→ step, R reset
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const d = useDirector.getState();
      const s = useSim.getState();
      if (e.key === 't' || e.key === 'T') {
        d.pause();
        s.setMode(s.mode === 'overview' ? 'tech' : 'overview');
      } else if (e.key === ' ' && d.active) {
        e.preventDefault();
        d.toggle();
      } else if (e.key === 'ArrowRight' && d.active) {
        d.next();
      } else if (e.key === 'ArrowLeft' && d.active) {
        d.prev();
      } else if (e.key === 'r' || e.key === 'R') {
        d.exit();
        void s.reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // manual interaction pauses autoplay
  useEffect(() => {
    const onUser = (e: Event) => {
      const d = useDirector.getState();
      if (!d.active || d.paused) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('[data-director]') || el?.closest?.('header')) return;
      d.pause();
    };
    window.addEventListener('pointerdown', onUser);
    window.addEventListener('wheel', onUser, { passive: true });
    window.addEventListener('touchmove', onUser, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onUser);
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchmove', onUser);
    };
  }, []);

  const openLab = () => {
    useDirector.getState().pause();
    useSim.setState({ mode: 'tech', section: 't5' });
  };

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-3 focus:py-2 focus:text-paper">
        Skip to content
      </a>
      <TopBar />
      <main id="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: reduce ? 0 : mode === 'tech' ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: reduce ? 0 : mode === 'tech' ? -40 : 40 }}
            transition={{ duration: reduce ? 0.15 : 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {mode === 'overview' ? (
              <Overview />
            ) : (
              <Suspense fallback={<div className="grid min-h-[60vh] place-items-center text-[17px] text-muted">Loading the engine room…</div>}>
                <Technical />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <StatusPill onOpen={openLab} />
      <DirectorBar />
    </div>
  );
}

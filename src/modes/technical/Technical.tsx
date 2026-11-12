import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useSim } from '../../sim/store';
import { EventFeed } from '../../components/EventFeed';
import { T1Architecture } from './T1Architecture';
import { T2Inventory } from './T2Inventory';
import { T3Planner } from './T3Planner';
import { T4Ledger } from './T4Ledger';
import { T5TamperLab } from './T5TamperLab';
import { T6Proof } from './T6Proof';
import { T7Findings } from './T7Findings';
import { T8Audit } from './T8Audit';
import { T9Production } from './T9Production';

export const SECTIONS = [
  { id: 't1', title: 'Architecture', pillar: 'All', C: T1Architecture },
  { id: 't2', title: 'Change detection & inventory', pillar: 'Hunt', C: T2Inventory },
  { id: 't3', title: 'Attack planner & safety', pillar: 'Hunt', C: T3Planner },
  { id: 't4', title: 'Integrity Ledger', pillar: 'Prove', C: T4Ledger },
  { id: 't5', title: 'Tamper Lab', pillar: 'Protect', C: T5TamperLab },
  { id: 't6', title: 'State-change proof', pillar: 'Prove', C: T6Proof },
  { id: 't7', title: 'Findings & tickets', pillar: 'Hunt', C: T7Findings },
  { id: 't8', title: 'Audit log hash chain', pillar: 'Prove', C: T8Audit },
  { id: 't9', title: 'Demo → production', pillar: 'All', C: T9Production },
];

export function Technical() {
  const section = useSim((s) => s.section);
  const setSection = useSim((s) => s.setSection);
  const feedOpen = useSim((s) => s.feedOpen);
  const setFeedOpen = useSim((s) => s.setFeedOpen);
  const reduce = useReducedMotion();
  const idx = Math.max(0, SECTIONS.findIndex((s) => s.id === section));
  const cur = SECTIONS[idx];
  const go = (i: number) => {
    setSection(SECTIONS[i].id);
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  };

  return (
    <div className={`mx-auto grid max-w-[1720px] gap-0 lg:grid-cols-[260px_minmax(0,1fr)] ${feedOpen ? 'xl:grid-cols-[260px_minmax(0,1fr)_340px]' : 'xl:grid-cols-[260px_minmax(0,1fr)_56px]'}`}>
      {/* Stepper */}
      <nav aria-label="Technical sections" className="border-line lg:sticky lg:top-[68px] lg:h-[calc(100vh-68px)] lg:border-r">
        <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-thin lg:flex-col lg:gap-1 lg:overflow-visible lg:px-4 lg:py-6">
          <div className="hidden px-2 pb-3 lg:block">
            <div className="text-[14px] font-semibold uppercase tracking-wider text-muted">Under the hood</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
              <motion.div className="h-full rounded-full bg-accent" animate={{ width: `${((idx + 1) / SECTIONS.length) * 100}%` }} />
            </div>
          </div>
          {SECTIONS.map((s, i) => {
            const active = s.id === cur.id;
            return (
              <button
                key={s.id}
                onClick={() => go(i)}
                aria-current={active ? 'step' : undefined}
                className={`relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? 'text-paper' : 'text-ink-2 hover:bg-surface'}`}
              >
                {active && <motion.span layoutId="stepper" className="absolute inset-0 -z-10 rounded-xl bg-ink" transition={{ type: 'spring', stiffness: 400, damping: 34 }} />}
                <span className={`font-mono text-[14px] font-semibold ${active ? 'text-paper/70' : i < idx ? 'text-accent' : 'text-muted'}`}>T{i + 1}</span>
                <span className="whitespace-nowrap text-[15px] font-semibold lg:whitespace-normal">{s.title}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <div className="min-w-0 px-4 pb-32 pt-6 md:px-8 lg:pt-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={cur.id}
            initial={{ opacity: 0, y: reduce ? 0 : 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <cur.C />
          </motion.div>
        </AnimatePresence>
        <div className="mt-12 flex items-center justify-between border-t border-line pt-6">
          <button disabled={idx === 0} onClick={() => go(idx - 1)} className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[16px] font-semibold text-ink-2 hover:bg-surface disabled:opacity-30">
            <ArrowLeft className="size-4" /> {idx > 0 ? SECTIONS[idx - 1].title : ''}
          </button>
          <button disabled={idx === SECTIONS.length - 1} onClick={() => go(idx + 1)} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[16px] font-semibold text-paper hover:bg-accent disabled:opacity-30">
            {idx < SECTIONS.length - 1 ? SECTIONS[idx + 1].title : 'End'} <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Live feed */}
      <aside className="hidden border-l border-line xl:block">
        <div className="sticky top-[68px] h-[calc(100vh-68px)]">
          {feedOpen ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between px-4 py-4">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-ok opacity-50" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-ok" />
                  </span>
                  Live event feed
                </span>
                <button onClick={() => setFeedOpen(false)} aria-label="Collapse event feed" className="grid size-9 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
                  <PanelRightClose className="size-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-24 scrollbar-thin">
                <EventFeed />
              </div>
            </div>
          ) : (
            <button onClick={() => setFeedOpen(true)} aria-label="Expand event feed" className="mx-auto mt-4 grid size-10 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink">
              <PanelRightOpen className="size-4" />
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

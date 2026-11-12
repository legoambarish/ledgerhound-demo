import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { STORY, useDirector } from '../sim/director';

export function DirectorBar() {
  const d = useDirector();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!d.active) return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [d.active]);

  const step = STORY[d.index];
  const elapsed = d.paused ? d.elapsedAtPause : now - d.stepStartedAt;
  const total = STORY.reduce((n, s) => n + s.duration, 0);
  const before = STORY.slice(0, d.index).reduce((n, s) => n + s.duration, 0);
  const pct = Math.min(1, (before + Math.min(elapsed, step.duration)) / total);

  return (
    <AnimatePresence>
      {d.active && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-3"
          data-director
        >
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-ink text-paper shadow-2xl">
            <div className="h-1 bg-white/10">
              <motion.div className="h-full bg-accent" animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.12, ease: 'linear' }} />
            </div>
            <div className="flex items-center gap-3 p-3 md:gap-4 md:p-4">
              <span className="hidden font-mono text-[14px] text-white/60 tabular md:inline">
                {String(d.index + 1).padStart(2, '0')}/{STORY.length}
              </span>
              <AnimatePresence mode="wait">
                <motion.p
                  key={d.finished ? 'end' : d.index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="min-w-0 flex-1 text-[16px] font-medium leading-snug md:text-[18px]"
                >
                  {d.finished ? (
                    <span className="font-display text-[20px] font-bold">Hunt. Prove. Protect. — LedgerHound</span>
                  ) : (
                    step.caption
                  )}
                </motion.p>
              </AnimatePresence>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={d.prev} aria-label="Previous step" className="grid size-10 place-items-center rounded-full hover:bg-white/10">
                  <SkipBack className="size-4" aria-hidden />
                </button>
                <button onClick={d.toggle} aria-label={d.paused ? 'Resume' : 'Pause'} className="grid size-11 place-items-center rounded-full bg-white text-ink">
                  {d.paused ? <Play className="size-4 fill-current" aria-hidden /> : <Pause className="size-4 fill-current" aria-hidden />}
                </button>
                <button onClick={d.next} aria-label="Next step" className="grid size-10 place-items-center rounded-full hover:bg-white/10">
                  <SkipForward className="size-4" aria-hidden />
                </button>
                <button onClick={d.exit} aria-label="Exit autoplay" className="grid size-10 place-items-center rounded-full hover:bg-white/10">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

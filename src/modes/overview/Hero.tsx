import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, Check, Lock } from 'lucide-react';
import { useSim } from '../../sim/store';

const CARDS = [
  { id: 'b-1003', route: 'DEL → SIN', name: 'Meera P.', fare: '₹18,400', cheat: '₹1' },
  { id: 'b-1002', route: 'BOM → DXB', name: 'Rohan K.', fare: '₹21,350', cheat: 'refund ×2' },
  { id: 'u-3', route: 'Skyline Travels', name: 'Kabir S.', fare: 'sub_agent', cheat: 'admin' },
  { id: 'b-1005', route: 'HYD → LHR', name: 'Sana Q.', fare: '₹37,650', cheat: 'read by Skyline' },
  { id: 'b-1001', route: 'BLR → DEL', name: 'Ishita R.', fare: '₹6,840', cheat: '₹0' },
  { id: 'b-1008', route: 'PNQ → BKK', name: 'Kunal J.', fare: '₹16,990', cheat: 'status: paid' },
];

type Phase = 'probe' | 'red' | 'sealed';

/** Ambient scene: stylised TripGrid cards, agent dots probing them, one gets caught and sealed. */
function AmbientBoard() {
  const reduce = useReducedMotion();
  const [target, setTarget] = useState(0);
  const [phase, setPhase] = useState<Phase>('probe');

  useEffect(() => {
    let i = 0;
    const timers: number[] = [];
    const cycle = () => {
      setTarget(i % CARDS.length);
      setPhase('probe');
      timers.push(window.setTimeout(() => setPhase('red'), 1400));
      timers.push(window.setTimeout(() => setPhase('sealed'), 2700));
      i += 1;
    };
    cycle();
    const id = window.setInterval(cycle, 4600);
    return () => {
      window.clearInterval(id);
      timers.forEach(window.clearTimeout);
    };
  }, []);

  return (
    <div className="relative grid grid-cols-2 gap-3 sm:gap-4" aria-hidden>
      {CARDS.map((c, i) => {
        const active = i === target;
        const red = active && phase === 'red';
        const sealed = active && phase === 'sealed';
        return (
          <motion.div
            key={c.id}
            animate={{
              y: reduce ? 0 : [0, i % 2 ? -4 : 4, 0],
              borderColor: red ? 'var(--bad)' : sealed ? 'var(--seal)' : 'var(--line)',
            }}
            transition={{ y: { duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }, borderColor: { duration: 0.25 } }}
            className="relative overflow-hidden rounded-2xl border-2 bg-surface p-4 shadow-card"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[15px] font-semibold text-muted">{c.id}</span>
              <span className="flex gap-1">
                {[0, 1, 2].map((d) => (
                  <motion.span
                    key={d}
                    className={`size-2 rounded-full ${active ? (red ? 'bg-bad' : 'bg-accent') : 'bg-line-2'}`}
                    animate={active && !reduce ? { scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] } : { scale: 1, opacity: 0.6 }}
                    transition={{ duration: 0.9, repeat: active ? Infinity : 0, delay: d * 0.15 }}
                  />
                ))}
              </span>
            </div>
            <div className="font-display mt-2 text-[20px] font-bold leading-tight text-ink">{c.route}</div>
            <div className="mt-0.5 text-[16px] text-muted">{c.name}</div>
            <div className="mt-3 flex items-center gap-2">
              <span className={`font-mono text-[17px] font-semibold tabular ${red ? 'text-muted line-through' : 'text-ink'}`}>{c.fare}</span>
              <AnimatePresence>
                {red && (
                  <motion.span initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="rounded-md bg-bad px-1.5 font-mono text-[15px] font-semibold text-white">
                    {c.cheat}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
            <AnimatePresence>
              {sealed && (
                <motion.div
                  initial={{ scale: reduce ? 1 : 1.8, opacity: 0, rotate: -14 }}
                  animate={{ scale: 1, opacity: 1, rotate: -8 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                  className="absolute right-3 top-9 flex items-center gap-1.5 rounded-lg border-2 border-seal bg-seal-soft px-2 py-1 font-display text-[15px] font-bold uppercase text-seal"
                >
                  <Lock className="size-3.5" /> sealed
                </motion.div>
              )}
            </AnimatePresence>
            {/* probing agent dot */}
            {active && phase === 'probe' && !reduce && (
              <motion.span
                className="absolute size-3 rounded-full bg-accent"
                initial={{ left: '-5%', top: '80%' }}
                animate={{ left: ['-5%', '60%', '85%'], top: ['80%', '30%', '70%'] }}
                transition={{ duration: 1.4, ease: 'easeInOut' }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function DeployCounter() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const target = 4 * 60 + 12;
  const [sec, setSec] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setSec(target);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 2200);
      setSec(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, target]);
  const done = sec >= target;
  return (
    <div ref={ref} className="inline-flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-3.5 shadow-card">
      <span className="text-[17px] text-ink-2">
        Deploy <ArrowRight className="inline size-4 align-[-2px]" /> verified finding
      </span>
      <span className="font-display text-[30px] font-bold leading-none text-ink tabular">
        {Math.floor(sec / 60)}m {String(sec % 60).padStart(2, '0')}s
      </span>
      <motion.span animate={{ scale: done ? 1 : 0.6, opacity: done ? 1 : 0.3 }} className="grid size-7 place-items-center rounded-full bg-ok text-white">
        <Check className="size-4" strokeWidth={3} />
      </motion.span>
    </div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  const words = 'Your platform shipped 14 changes today.'.split(' ');
  return (
    <section id="hero" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-[1320px] items-center gap-12 px-5 pb-20 pt-14 md:px-8 lg:grid-cols-[1.15fr_1fr] lg:pt-20">
        <div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[15px] font-medium text-ink-2">
            <span className="size-2 rounded-full bg-ok" /> Security agents for B2B travel platforms
          </motion.div>
          <h1 className="font-display text-[44px] font-extrabold leading-[0.98] text-ink sm:text-[60px] xl:text-[76px]">
            {words.map((w, i) => (
              <motion.span
                key={i}
                className="mr-[0.22em] inline-block"
                initial={{ opacity: 0, y: reduce ? 0 : 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                {w}
              </motion.span>
            ))}
            <motion.span
              className="block text-accent"
              initial={{ opacity: 0, y: reduce ? 0 : 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              We attacked every one of them.
            </motion.span>
          </h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mt-7 max-w-[560px] text-[20px] leading-relaxed text-ink-2">
            LedgerHound’s AI agents test every release the moment it ships, prove what’s really broken, and seal your data so nobody can quietly change it.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }} className="mt-8 flex flex-wrap gap-3">
            <a href="#cheat" className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-[17px] font-semibold text-paper transition hover:bg-accent active:scale-[0.97]">
              Try to cheat the system <ArrowDown className="size-4" />
            </a>
            <button
              onClick={() => useSim.getState().setMode('tech')}
              className="inline-flex items-center gap-2 rounded-full border border-line-2 bg-surface px-6 py-3.5 text-[16px] font-semibold text-ink sm:text-[17px] transition hover:border-ink active:scale-[0.97]"
            >
              <span className="sm:hidden">See how it works</span><span className="hidden sm:inline">See how it works under the hood</span> <ArrowRight className="size-4" />
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="mt-10">
            <DeployCounter />
          </motion.div>
        </div>
        <motion.div initial={{ opacity: 0, scale: reduce ? 1 : 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.8 }} className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[32px] grid-paper opacity-60 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
          <div className="mb-3 flex items-center justify-between px-1 text-[15px] text-muted">
            <span className="font-semibold text-ink-2">TripGrid · live bookings</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent" /> agent probing</span>
          </div>
          <AmbientBoard />
        </motion.div>
      </div>
    </section>
  );
}

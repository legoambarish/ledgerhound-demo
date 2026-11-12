import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CalendarClock, Equal, Megaphone } from 'lucide-react';
import { Reveal } from '../../components/ui';

function useLoop(steps: number, ms: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => (x + 1) % steps), ms);
    return () => window.clearInterval(t);
  }, [steps, ms]);
  return i;
}

function Stage({ children }: { children: ReactNode }) {
  return <div className="relative grid h-[150px] place-items-center overflow-hidden rounded-xl bg-surface-2">{children}</div>;
}

function PeekScene() {
  const i = useLoop(2, 1800);
  const reduce = useReducedMotion();
  return (
    <Stage>
      <div className="flex w-full items-center justify-around px-4">
        <div className="text-center">
          <div className="rounded-lg border-2 border-ink px-3 py-2 font-display text-[16px] font-bold text-ink">Skyline</div>
        </div>
        <div className="relative h-14 w-24">
          <motion.div
            className="absolute top-2 h-10 w-14 rounded-md border-2 border-bad bg-bad-soft"
            animate={{ left: i ? (reduce ? '0%' : '-8%') : '60%' }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          >
            <div className="mx-auto mt-1.5 h-1.5 w-8 rounded bg-bad/50" />
            <div className="mx-auto mt-1 h-1.5 w-6 rounded bg-bad/30" />
          </motion.div>
        </div>
        <div className="rounded-lg border-2 border-line-2 px-3 py-2 font-display text-[16px] font-bold text-muted">BlueOrbit</div>
      </div>
    </Stage>
  );
}

function FareScene() {
  const i = useLoop(2, 1900);
  return (
    <Stage>
      <div className="text-center">
        <div className="text-[15px] text-muted">DEL → SIN · fare</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ y: 18, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -18, opacity: 0 }}
            className={`font-display text-[44px] font-extrabold tabular ${i ? 'text-bad' : 'text-ink'}`}
          >
            {i ? '₹1' : '₹18,400'}
          </motion.div>
        </AnimatePresence>
      </div>
    </Stage>
  );
}

function RefundScene() {
  const i = useLoop(3, 1000);
  return (
    <Stage>
      <div className="flex items-end gap-3">
        {[0, 1].map((k) => (
          <motion.div
            key={k}
            animate={{ y: i > k ? 0 : -60, opacity: i > k ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
            className={`grid size-14 place-items-center rounded-full border-2 font-display text-[18px] font-bold ${k ? 'border-bad bg-bad-soft text-bad' : 'border-ok bg-ok-soft text-ok'}`}
          >
            ₹
          </motion.div>
        ))}
        <div className="ml-2 font-display text-[28px] font-extrabold text-ink tabular">×{Math.max(i, 0)}</div>
      </div>
    </Stage>
  );
}

function AdminScene() {
  const i = useLoop(2, 2000);
  return (
    <Stage>
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-full bg-ink font-display text-[17px] font-bold text-paper">KS</div>
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: -90, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className={`rounded-full px-3.5 py-1.5 font-mono text-[17px] font-semibold ${i ? 'bg-bad text-white' : 'bg-surface text-ink-2 ring-1 ring-line-2'}`}
          >
            {i ? 'admin' : 'sub_agent'}
          </motion.span>
        </AnimatePresence>
      </div>
    </Stage>
  );
}

const PROBLEMS = [
  { title: 'One agency reads another’s bookings', body: 'Change one ID in a request and a competitor’s travellers show up.', scene: <PeekScene /> },
  { title: 'A fare changed to ₹1', body: 'The ticket still gets issued. Your platform pays the airline the difference.', scene: <FareScene /> },
  { title: 'A refund paid twice', body: 'Same refund, sent again. The money leaves twice.', scene: <RefundScene /> },
  { title: 'A sub-agent quietly becomes admin', body: 'One extra field in a profile update, and they hold every key.', scene: <AdminScene /> },
];

export function Problem() {
  return (
    <section id="problem" className="border-t border-line bg-surface/40">
      <div className="mx-auto max-w-[1320px] px-5 py-24 md:px-8">
        <Reveal>
          <h2 className="font-display max-w-4xl text-[38px] font-extrabold leading-[1.02] text-ink md:text-[56px]">
            The most expensive bugs aren’t crashes. <span className="text-bad">They’re cheats.</span>
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROBLEMS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border border-line bg-surface p-4 shadow-card">
                {p.scene}
                <h3 className="font-display mt-5 px-1 text-[22px] font-bold leading-tight text-ink">{p.title}</h3>
                <p className="mt-2 px-1 pb-1 text-[17px] leading-snug text-ink-2">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="mt-12 rounded-2xl border border-line bg-surface p-6 md:p-8">
            <p className="font-display text-[24px] font-bold text-ink md:text-[28px]">Why do ordinary scanners miss them?</p>
            <div className="mt-5 grid gap-5 md:grid-cols-3">
              {[
                { icon: CalendarClock, t: 'They run on a schedule.', d: 'Weekly scans. You ship daily.' },
                { icon: Equal, t: 'They treat every endpoint the same.', d: 'A refund isn’t a search box.' },
                { icon: Megaphone, t: 'They drown teams in false alarms.', d: 'So the real one gets ignored.' },
              ].map((x) => (
                <div key={x.t} className="flex gap-4">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-bad-soft text-bad">
                    <x.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <div className="text-[18px] font-semibold text-ink">{x.t}</div>
                    <div className="text-[17px] text-muted">{x.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

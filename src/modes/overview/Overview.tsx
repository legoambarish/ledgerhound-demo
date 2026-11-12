import { useEffect, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowRight, Crosshair, Fingerprint, ShieldCheck } from 'lucide-react';
import { useSim } from '../../sim/store';
import { Reveal, Term } from '../../components/ui';
import { Hero } from './Hero';
import { Problem } from './Problem';
import { CheatLab } from './CheatLab';
import { LogoMark } from '../../components/Logo';

const PILLARS = [
  {
    icon: Crosshair,
    name: 'Hunt',
    promise: 'Agents attack every change the moment it ships.',
    analogy: 'A red team that never sleeps.',
    detail: (
      <>
        They map your API with no documentation, find forgotten <Term tip="An old endpoint that still answers but nobody uses — like /v1 after /v3 shipped.">zombie</Term> and undocumented{' '}
        <Term tip="An endpoint in real use that nobody ever wrote down.">shadow</Term> endpoints, and pick only the tests that matter.
      </>
    ),
  },
  {
    icon: Fingerprint,
    name: 'Prove',
    promise: 'Every finding comes with evidence nobody can argue with.',
    analogy: 'A receipt for every finding — no guesswork, no false alarms.',
    detail: (
      <>
        We fingerprint your data before and after each test. If the data changed, the bug is real. Fingerprints go on a{' '}
        <Term tip="A shared record that nobody — including us — can quietly edit after the fact.">blockchain</Term>.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    name: 'Protect',
    promise: 'Unexplained changes to your data are caught and undone.',
    analogy: 'A tamper seal on every row of your database, that repairs itself.',
    detail: <>Real customer activity never raises an alarm. A change nobody can explain is restored from a locked backup in seconds.</>,
  },
];

function PillarGlyph({ i }: { i: number }) {
  const reduce = useReducedMotion();
  if (i === 0)
    return (
      <svg viewBox="0 0 120 80" className="h-20 w-full" aria-hidden>
        {[20, 60, 100].map((x) => (
          <rect key={x} x={x - 14} y={28} width={28} height={24} rx={5} fill="var(--surface-2)" stroke="var(--line-2)" />
        ))}
        <motion.circle r={6} fill="var(--accent)" cy={40} animate={reduce ? { cx: 60 } : { cx: [20, 60, 100, 20] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }} />
      </svg>
    );
  if (i === 1)
    return (
      <svg viewBox="0 0 120 80" className="h-20 w-full" aria-hidden>
        {[0, 1, 2, 3].map((k) => (
          <rect key={k} x={10 + k * 27} y={56} width={18} height={14} rx={3} fill="var(--surface-2)" stroke="var(--line-2)" />
        ))}
        <path d="M19 56 L32 38 M46 56 L32 38 M73 56 L86 38 M100 56 L86 38 M32 38 L59 16 M86 38 L59 16" stroke="var(--line-2)" fill="none" strokeWidth={1.5} />
        <motion.circle cx={59} cy={14} r={8} fill="var(--seal)" animate={reduce ? {} : { scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      </svg>
    );
  return (
    <svg viewBox="0 0 120 80" className="h-20 w-full" aria-hidden>
      {[0, 1, 2, 3, 4].map((k) => (
        <motion.rect
          key={k}
          x={14}
          y={8 + k * 14}
          width={92}
          height={10}
          rx={3}
          animate={k === 2 && !reduce ? { fill: ['var(--line)', 'var(--bad)', 'var(--ok)', 'var(--line)'] } : { fill: 'var(--line)' }}
          transition={{ duration: 3, repeat: Infinity, times: [0, 0.3, 0.6, 1] }}
        />
      ))}
    </svg>
  );
}

function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduce) return setV(to);
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1600);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to, reduce]);
  return (
    <span ref={ref} className="tabular">
      {prefix}
      {v}
      {suffix}
    </span>
  );
}

export function Overview() {
  const toTech = () => useSim.getState().setMode('tech');
  return (
    <div>
      <Hero />
      <Problem />
      <CheatLab />

      {/* Pillars */}
      <section id="pillars" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-[1320px] px-5 py-24 md:px-8">
          <Reveal>
            <h2 className="font-display text-[44px] font-extrabold leading-none text-ink md:text-[72px]">
              Hunt<span className="text-muted">.</span> Prove<span className="text-muted">.</span> Protect<span className="text-accent">.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.1}>
                <div className="flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-card">
                  <div className="flex items-center gap-3">
                    <span className="grid size-12 place-items-center rounded-xl bg-ink text-paper">
                      <p.icon className="size-6" aria-hidden />
                    </span>
                    <span className="font-display text-[30px] font-extrabold text-ink">{p.name}</span>
                  </div>
                  <div className="my-5 rounded-xl bg-surface-2 px-2">
                    <PillarGlyph i={i} />
                  </div>
                  <p className="text-[20px] font-semibold leading-snug text-ink">{p.promise}</p>
                  <p className="mt-3 text-[18px] leading-relaxed text-ink-2">{p.detail}</p>
                  <p className="mt-auto pt-5 font-display text-[19px] font-semibold italic text-accent">“{p.analogy}”</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="border-t border-line bg-ink text-paper">
        <div className="mx-auto max-w-[1320px] px-5 py-16 md:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: <><span>&lt; </span><Counter to={5} /> min</>, l: 'from deploy to a verified finding' },
              { v: <><span>&lt; </span><Counter to={5} suffix="%" /></>, l: 'false positives' },
              { v: <Counter to={100} suffix="%" />, l: 'of endpoints mapped without docs' },
              { v: <Counter to={7} />, l: 'zombie & shadow APIs found' },
            ].map((m, i) => (
              <Reveal key={i} delay={i * 0.07}>
                <div className="border-l-2 border-accent pl-5">
                  <div className="font-display text-[52px] font-extrabold leading-none">{m.v}</div>
                  <div className="mt-2 text-[18px] text-paper/70">{m.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="mt-10 text-[16px] text-paper/60">Demo targets, measured on the simulated TripGrid platform.</p>
        </div>
      </section>

      {/* Who */}
      <section className="border-t border-line">
        <div className="mx-auto grid max-w-[1320px] items-center gap-10 px-5 py-24 md:px-8 lg:grid-cols-2">
          <Reveal>
            <div className="font-mono text-[15px] font-semibold uppercase tracking-[0.16em] text-accent">Who it’s for</div>
            <h2 className="font-display mt-2 text-[36px] font-extrabold leading-[1.04] text-ink md:text-[52px]">B2B travel platforms shipping daily.</h2>
            <p className="mt-4 text-[20px] text-ink-2">If money, trips and trust move through your APIs every minute, the cheats live there too.</p>
          </Reveal>
          <div className="flex flex-wrap gap-3">
            {['Bookings', 'Payments & refunds', 'Agency credit', 'Supplier APIs', 'Roles & sub-agents', 'Traveller PII'].map((t, i) => (
              <Reveal key={t} delay={i * 0.06} y={12}>
                <span className="inline-block rounded-full border-2 border-ink px-5 py-2.5 font-display text-[20px] font-bold text-ink">{t}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-line bg-surface/40">
        <div className="mx-auto flex max-w-[1320px] flex-col items-center px-5 py-28 text-center md:px-8">
          <Reveal>
            <LogoMark size={56} />
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="font-display mt-6 max-w-3xl text-[40px] font-extrabold leading-[1.02] text-ink md:text-[64px]">Curious how it actually works?</h2>
          </Reveal>
          <Reveal delay={0.2}>
            <button
              onClick={toTech}
              className="mt-10 inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-[19px] font-semibold text-paper transition hover:gap-5 hover:bg-accent active:scale-[0.97]"
            >
              See how it works under the hood <ArrowRight className="size-5" />
            </button>
          </Reveal>
          <p className="mt-16 text-[16px] text-muted">LedgerHound · demo for the TBO hackathon · all companies, people and data are fictional.</p>
        </div>
      </section>
    </div>
  );
}

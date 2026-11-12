import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CircleSlash, Play, Power, ShieldAlert, X, Zap } from 'lucide-react';
import { useSim } from '../../sim/store';
import { ENDPOINTS, PLANNER } from '../../sim/seed';
import { Badge, Button } from '../../components/ui';
import { METHOD_COLOR, Panel, Section } from './shared';

const FLOW = ['search', 'hold', 'book', 'pay', 'cancel', 'refund'];

function Gauge() {
  const h = useSim((s) => s.hunt);
  const max = 5;
  const pct = Math.min(1, h.rps / max);
  const angle = -180 + pct * 180;
  const r = 80;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [100 + r * Math.cos((a * Math.PI) / 180), 100 + r * Math.sin((a * Math.PI) / 180)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
  };
  const limitA = -180 + (h.rpsLimit / max) * 180;
  const strained = h.latency > 800;
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 120" className="w-full max-w-[260px]" role="img" aria-label={`${h.rps} requests per second`}>
        <path d={arc(-180, 0)} stroke="var(--line)" strokeWidth={16} fill="none" strokeLinecap="round" />
        <motion.path d={arc(-180, Math.max(-179.9, angle))} stroke={h.backoff ? 'var(--warn)' : 'var(--accent)'} strokeWidth={16} fill="none" strokeLinecap="round" initial={false} animate={{ d: arc(-180, Math.max(-179.9, angle)) }} />
        <line
          x1={100 + (r - 14) * Math.cos((limitA * Math.PI) / 180)}
          y1={100 + (r - 14) * Math.sin((limitA * Math.PI) / 180)}
          x2={100 + (r + 14) * Math.cos((limitA * Math.PI) / 180)}
          y2={100 + (r + 14) * Math.sin((limitA * Math.PI) / 180)}
          stroke="var(--ink)"
          strokeWidth={3}
        />
        <text x={100} y={92} textAnchor="middle" className="font-display" fontSize={30} fontWeight={800} fill="var(--ink)">
          {h.rps.toFixed(1)}
        </text>
        <text x={100} y={114} textAnchor="middle" fontSize={14} fill="var(--muted)">
          req/s · limit {h.rpsLimit}
        </text>
      </svg>
      <div className={`mt-2 flex items-center gap-2 rounded-full px-3 py-1 text-[15px] font-semibold ${strained ? 'bg-warn-soft text-warn' : 'bg-ok-soft text-ok'}`}>
        App p95 latency {h.latency} ms {strained ? '· backing off' : '· healthy'}
      </div>
    </div>
  );
}

export function T3Planner() {
  const h = useSim((s) => s.hunt);
  const s = useSim.getState();
  const ctx = PLANNER.find((p) => p.endpointId === h.plannerEndpoint) ?? PLANNER[0];
  const ep = ENDPOINTS.find((e) => e.id === ctx.endpointId)!;
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [h.execLog.length]);
  const flowPos = FLOW.findIndex((f) => ctx.flow.includes(f) && f === (ctx.endpointId === 'e7' ? 'refund' : ctx.endpointId === 'e3' ? 'book' : '__'));

  return (
    <Section
      n={3}
      title="Attack planner & safe execution"
      lead="An LLM planner reasons over the knowledge graph — params, roles, where the endpoint sits in the booking flow — and chooses a handful of targeted tests. Executors run them inside a safety layer."
      plain="Instead of throwing ten thousand random attacks at every door, the planner looks at what each door is for and picks the few tricks that could actually work there — and writes down why. Agents then try them politely: slowly, only on approved targets, and they ask a human before anything risky."
    >
      <div className="flex flex-wrap gap-2">
        {PLANNER.map((p) => {
          const e = ENDPOINTS.find((x) => x.id === p.endpointId)!;
          const on = p.endpointId === ctx.endpointId;
          return (
            <button key={p.endpointId} onClick={() => s.setPlannerEndpoint(p.endpointId)} className={`rounded-full border-2 px-4 py-2 font-mono text-[15px] font-semibold transition ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink hover:border-ink'}`}>
              {e.method} {e.path}
            </button>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.3fr]">
        <Panel title="Knowledge-graph context">
          <div className="space-y-4 text-[16px]">
            <div>
              <div className="text-[14px] font-semibold uppercase tracking-wide text-muted">Endpoint</div>
              <div className="font-mono text-[17px]"><span className={`font-bold ${METHOD_COLOR[ep.method]}`}>{ep.method}</span> {ep.path}</div>
            </div>
            <div>
              <div className="text-[14px] font-semibold uppercase tracking-wide text-muted">Parameters</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ctx.params.map((p) => (
                  <span key={p} className={`rounded-md px-2 py-0.5 font-mono text-[15px] ${p.includes('←') ? 'bg-bad-soft font-semibold text-bad' : 'bg-surface-2 text-ink-2'}`}>{p}</span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[14px] font-semibold uppercase tracking-wide text-muted">Roles that can call it</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ctx.roles.map((r) => <Badge key={r} tone={r === 'sub_agent' ? 'warn' : 'muted'}>{r}</Badge>)}
              </div>
            </div>
            <div>
              <div className="text-[14px] font-semibold uppercase tracking-wide text-muted">Flow position</div>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {FLOW.map((f, i) => (
                  <span key={f} className="flex items-center gap-1">
                    <span className={`rounded-md px-2 py-0.5 text-[15px] font-semibold ${i === flowPos ? 'bg-accent text-white' : 'bg-surface-2 text-muted'}`}>{f}</span>
                    {i < FLOW.length - 1 && <span className="text-line-2">→</span>}
                  </span>
                ))}
              </div>
              <div className="mt-1.5 text-[15px] text-muted">{ctx.flow}</div>
            </div>
          </div>
        </Panel>

        <Panel title="Planner decision">
          <AnimatePresence mode="wait">
            <motion.div key={ctx.endpointId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="text-[14px] font-semibold uppercase tracking-wide text-ok">Chosen · {ctx.chosen.length} tests</div>
              <ol className="mt-2 space-y-2.5">
                {ctx.chosen.map((t, i) => (
                  <motion.li key={t.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.12 }} className="rounded-xl border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                      <Check className="size-4 text-ok" /> {t.name} {t.risky && <Badge tone="warn">needs approval</Badge>}
                    </div>
                    <div className="mt-1 text-[15px] leading-snug text-ink-2">{t.reasoning}</div>
                  </motion.li>
                ))}
              </ol>
              <div className="mt-5 text-[14px] font-semibold uppercase tracking-wide text-muted">Skipped</div>
              <ul className="mt-2 space-y-1.5">
                {ctx.skipped.map((t) => (
                  <li key={t.name} className="flex gap-2 text-[15px] text-muted">
                    <CircleSlash className="mt-1 size-4 shrink-0" /> <span><span className="font-semibold text-ink-2 line-through decoration-line-2">{t.name}</span> — {t.why}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel
          title="Executor log"
          right={
            <div className="flex gap-2">
              <Button variant="primary" onClick={() => s.startExecutors()} disabled={h.killed}>
                <Play className="size-4 fill-current" /> Run executors
              </Button>
              <Button variant="ghost" onClick={() => s.spikeLatency()}>
                <Zap className="size-4" /> Simulate latency spike
              </Button>
            </div>
          }
        >
          <div ref={logRef} className="h-[260px] overflow-y-auto rounded-xl bg-ink p-4 font-mono text-[14px] leading-relaxed scrollbar-thin">
            {h.execLog.length === 0 && <div className="text-paper/50">$ waiting for a plan… press “Run executors”</div>}
            {h.execLog.map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={l.level === 'alert' ? 'text-[#ff8a7a]' : l.level === 'warn' ? 'text-[#f5c26b]' : l.level === 'ok' ? 'text-[#6fe0ad]' : 'text-paper/85'}>
                <span className="text-paper/40">{new Date(l.t).toTimeString().slice(0, 8)}</span> {l.text}
              </motion.div>
            ))}
          </div>
        </Panel>
        <Panel title="Rate limit & app health">
          <Gauge />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel title="Human-approval queue">
          <ul className="space-y-3">
            {h.approvals.length === 0 && <li className="text-[15px] text-muted">Nothing waiting.</li>}
            {h.approvals.map((a) => (
              <li key={a.id} className="rounded-xl border border-line p-3.5">
                <div className="flex items-center gap-2 font-semibold text-ink">
                  <ShieldAlert className="size-4 text-warn" /> {a.test}
                </div>
                <div className="font-mono text-[14px] text-ink-2">{a.endpoint}</div>
                <div className="mt-1 text-[15px] text-muted">{a.risk}</div>
                {a.status === 'pending' ? (
                  <div className="mt-3 flex gap-2">
                    <Button variant="primary" onClick={() => s.decideApproval(a.id, true)}><Check className="size-4" /> Approve</Button>
                    <Button variant="ghost" onClick={() => s.decideApproval(a.id, false)}><X className="size-4" /> Deny</Button>
                  </div>
                ) : (
                  <div className="mt-2"><Badge tone={a.status === 'approved' ? 'ok' : 'bad'}>{a.status}</Badge></div>
                )}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Kill switch">
          <button
            onClick={() => s.setKill(!h.killed)}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl border-4 py-8 font-display text-[24px] font-extrabold uppercase tracking-wide transition active:scale-[0.98] ${h.killed ? 'border-bad bg-bad text-white' : 'border-bad/30 bg-bad-soft text-bad hover:border-bad'}`}
            aria-pressed={h.killed}
          >
            <Power className="size-7" /> {h.killed ? 'Agents halted' : 'Stop all agents'}
          </button>
          <p className="mt-3 text-[15px] text-muted">The orchestrator also pulls this automatically when the safety layer raises an alarm.</p>
        </Panel>
        <Panel title="Scope allowlist">
          <ul className="space-y-2 font-mono text-[15px]">
            <li className="flex items-center gap-2 text-ok"><Check className="size-4" /> tripgrid-staging.test</li>
            <li className="flex items-center gap-2 text-ok"><Check className="size-4" /> api.tripgrid-staging.test/v1–v3</li>
            <li className="flex items-center gap-2 text-ok"><Check className="size-4" /> partner.tripgrid-staging.test</li>
            <li className="flex items-center gap-2 text-bad"><X className="size-4" /> *.supplier-gateway.example (out of scope)</li>
            <li className="flex items-center gap-2 text-bad"><X className="size-4" /> payments-provider (never touched)</li>
          </ul>
          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-[15px] text-ink-2">Test credentials come from a vault, expire in 15 minutes and are scoped to two test agencies.</div>
        </Panel>
      </div>
    </Section>
  );
}

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Rocket } from 'lucide-react';
import { useSim } from '../../sim/store';
import { ENDPOINTS, OPENAPI_YAML, type EndpointState } from '../../sim/seed';
import { Badge, Button, Term } from '../../components/ui';
import { METHOD_COLOR, Panel, Section } from './shared';

const STAGES = ['Change detected', 'Inventory diff', 'Attack planned', 'Executing', 'Proven', 'Reverted', 'Ticket raised'];

const STATE_TONE: Record<EndpointState, 'ok' | 'warn' | 'bad'> = { active: 'ok', zombie: 'warn', shadow: 'bad' };
const REC_TONE = { keep: 'muted', decommission: 'bad', restrict: 'warn', update: 'seal', document: 'seal' } as const;

function Timer() {
  const h = useSim((s) => s.hunt);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!h.deployStartedAt || h.deployFindingAt) return;
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, [h.deployStartedAt, h.deployFindingAt]);
  if (!h.deployStartedAt) return <span className="text-muted">—</span>;
  const ms = (h.deployFindingAt ?? now) - h.deployStartedAt;
  return <span className="tabular">{(ms / 1000).toFixed(1)}s</span>;
}

export function T2Inventory() {
  const h = useSim((s) => s.hunt);
  const run = useSim((s) => s.runScenario);
  const sc = useSim((s) => s.scenario);
  const [filter, setFilter] = useState<'all' | EndpointState>('all');
  const [tab, setTab] = useState<'table' | 'yaml'>('table');
  const running = sc?.id === 'deploy' && !sc.done;

  const visible = ENDPOINTS.filter((e) => h.inventoryScanned || !e.discoveredByDeploy);
  const shown = visible.filter((e) => filter === 'all' || e.state === filter);
  const counts = { active: visible.filter((e) => e.state === 'active').length, zombie: visible.filter((e) => e.state === 'zombie').length, shadow: visible.filter((e) => e.state === 'shadow').length };

  const diffRows = [
    { tag: '+ new', tone: 'seal' as const, ep: 'PATCH /v3/users/{id}', note: 'Found in JS bundle diff main.8f2c.js' },
    { tag: '~ changed', tone: 'warn' as const, ep: 'POST /v3/refunds', note: 'New body field refund_request_id' },
    { tag: 'zombie', tone: 'warn' as const, ep: 'GET /v1/bookings/export', note: 'Still answers; no traffic in 211 days; no auth' },
    { tag: 'shadow', tone: 'bad' as const, ep: 'POST /internal/refund-override', note: 'In gateway logs; never documented' },
  ];

  return (
    <Section
      n={2}
      title="Change detection & API inventory"
      lead={
        <>
          A deploy webhook, a new JS bundle, a new endpoint in traffic or a new subdomain wakes the agents. Recon maps the API from the UI, HAR traffic and bundles — then compares with 90 days of gateway logs to label each endpoint{' '}
          <Term tip="Documented and used.">active</Term>, <Term tip="Still live but no real traffic — e.g. /v1 after /v3 shipped.">zombie</Term> or <Term tip="In use but never documented.">shadow</Term>.
        </>
      }
      plain="Every time the platform changes, we notice within seconds and redraw the map of every door into it. Some doors were forgotten years ago but still open (zombies); some are used but nobody wrote them down (shadows). Both are where attackers look first."
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <Panel
          title="Deploy feed"
          right={
            <Button variant="primary" onClick={() => run('deploy')} disabled={running}>
              <Rocket className="size-4" /> Ship a new release
            </Button>
          }
        >
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="font-mono text-[20px] font-bold text-ink">tripgrid-api {h.deployStage > 0 ? 'v2.14.0' : 'v2.13.4'}</span>
            <span className="text-[15px] text-muted">{h.deployStage > 0 ? 'deployed just now via CI/CD webhook' : 'next: v2.14.0 ready to ship'}</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-[16px] text-ink-2">
            <li>• Adds <code className="font-mono text-warn">PATCH /v3/users/{'{id}'}</code> so agents can edit their profile</li>
            <li>• Changes <code className="font-mono text-accent">POST /v3/refunds</code> to accept <code className="font-mono">refund_request_id</code></li>
            <li>• New front-end bundle <code className="font-mono">main.8f2c.js</code></li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2">
            {STAGES.map((s, i) => {
              const on = h.deployStage > i;
              const cur = h.deployStage === i + 1 && running;
              return (
                <motion.span
                  key={s}
                  animate={{ scale: cur ? 1.05 : 1 }}
                  className={`rounded-full px-3 py-1 text-[14px] font-semibold transition ${on ? (i === 6 ? 'bg-ok text-white' : 'bg-ink text-paper') : 'border border-line bg-surface-2 text-muted'}`}
                >
                  {i + 1}. {s}
                </motion.span>
              );
            })}
          </div>
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-surface-2 p-3.5 text-[16px]">
            <span className="text-ink-2">Deploy → verified finding (simulated, sped up):</span>
            <span className="font-display text-[22px] font-bold text-ink">
              <Timer />
            </span>
          </div>
        </Panel>

        <Panel title="Endpoint diff since v2.13.4">
          <AnimatePresence mode="wait">
            {h.inventoryScanned ? (
              <motion.ul key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
                {diffRows.map((r, i) => (
                  <motion.li key={r.ep} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="flex flex-wrap items-center gap-3 rounded-xl border border-line p-3">
                    <Badge tone={r.tone}>{r.tag}</Badge>
                    <code className="font-mono text-[15px] font-semibold text-ink">{r.ep}</code>
                    <span className="w-full text-[15px] text-muted">{r.note}</span>
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <motion.p key="e" className="py-8 text-center text-[16px] text-muted">
                Ship v2.14.0 to see recon diff the API: +1 new, 1 changed, 1 zombie, 1 shadow.
              </motion.p>
            )}
          </AnimatePresence>
        </Panel>
      </div>

      <Panel
        title={
          <span className="flex flex-wrap items-center gap-3">
            API inventory <span className="text-[15px] font-normal text-muted">· {visible.length} endpoints, no documentation used</span>
          </span>
        }
        right={
          <div className="flex rounded-full border border-line bg-surface-2 p-1 text-[14px] font-semibold">
            {(['table', 'yaml'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-full px-3.5 py-1 ${tab === t ? 'bg-ink text-paper' : 'text-ink-2'}`}>
                {t === 'table' ? 'Inventory' : 'Generated OpenAPI'}
              </button>
            ))}
          </div>
        }
      >
        {tab === 'table' ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {(['all', 'active', 'zombie', 'shadow'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3.5 py-1 text-[15px] font-semibold capitalize ${filter === f ? 'border-ink bg-ink text-paper' : 'border-line text-ink-2 hover:border-ink'}`}>
                  {f} {f !== 'all' && <span className="opacity-60">{counts[f]}</span>}
                </button>
              ))}
              <div className="ml-auto hidden h-3 w-56 self-center overflow-hidden rounded-full sm:flex">
                <div className="bg-ok" style={{ width: `${(counts.active / visible.length) * 100}%` }} />
                <div className="bg-warn" style={{ width: `${(counts.zombie / visible.length) * 100}%` }} />
                <div className="bg-bad" style={{ width: `${(counts.shadow / visible.length) * 100}%` }} />
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[900px] text-left text-[15px]">
                <thead className="text-[14px] uppercase tracking-wide text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-3 font-semibold">Endpoint</th>
                    <th className="py-2 pr-3 font-semibold">State</th>
                    <th className="py-2 pr-3 font-semibold">Last real traffic</th>
                    <th className="py-2 pr-3 font-semibold">Auth</th>
                    <th className="py-2 pr-3 font-semibold">Data exposed</th>
                    <th className="py-2 pr-3 font-semibold">Owner</th>
                    <th className="py-2 pr-3 font-semibold">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {shown.map((e) => (
                      <motion.tr
                        key={e.id}
                        layout
                        initial={{ opacity: 0, backgroundColor: 'var(--accent-soft)' }}
                        animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                        transition={{ backgroundColor: { duration: 1.6 } }}
                        className="border-b border-line last:border-0"
                      >
                        <td className="py-2.5 pr-3">
                          <span className={`font-mono font-bold ${METHOD_COLOR[e.method]}`}>{e.method}</span> <span className="font-mono text-ink">{e.path}</span>
                          {e.diff && h.inventoryScanned && <span className="ml-2"><Badge tone={e.diff === 'new' ? 'seal' : 'warn'}>{e.diff}</Badge></span>}
                          <div className="text-[14px] text-muted">via {e.source}</div>
                        </td>
                        <td className="py-2.5 pr-3"><Badge tone={STATE_TONE[e.state]}>{e.state}</Badge></td>
                        <td className="py-2.5 pr-3 tabular text-ink-2">{e.lastSeen}</td>
                        <td className={`py-2.5 pr-3 font-mono ${e.auth === 'none' ? 'font-bold text-bad' : 'text-ink-2'}`}>{e.auth}</td>
                        <td className="py-2.5 pr-3 text-ink-2">{e.data}</td>
                        <td className="py-2.5 pr-3 text-ink-2">{e.owner}</td>
                        <td className="py-2.5 pr-3"><Badge tone={REC_TONE[e.recommendation]}>{e.recommendation}</Badge></td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <pre className="max-h-[520px] overflow-auto rounded-xl bg-ink p-5 font-mono text-[14px] leading-relaxed text-paper scrollbar-thin">{OPENAPI_YAML}</pre>
        )}
      </Panel>
    </Section>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ShoppingBag, Wrench, X } from 'lucide-react';
import { useSim, FINDING_LINK_TEXT, type Incident } from '../../sim/store';
import { CONFIG, SCENARIOS, STAGE_CAPTIONS, type ScenarioId } from '../../sim/scenarios';
import { RowTable } from '../../components/RowTable';
import { MerkleTree } from '../../components/MerkleTree';
import { BlockStrip } from '../../components/BlockStrip';
import { Badge, Button, Hash, fmtBlock } from '../../components/ui';
import { Panel, Section, Switch } from './shared';

type StepState = 'off' | 'on' | 'bad' | 'ok' | 'seal' | 'skip';

function useNow() {
  const [n, setN] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setN(Date.now()), 120);
    return () => window.clearInterval(t);
  }, []);
  return n;
}

function pipeline(inc: Incident | null, now: number) {
  const common = ['Row changed', 'Root recomputed', 'Compare with on-chain root', 'Journal check'];
  const legit = ['Queued for anchoring', 'Anchored next epoch'];
  const tamper = ['Alert', 'Merkle proof', 'Restore from vault', 'Root re-verified', 'Repair receipt anchored'];
  const st = (i: number): StepState => {
    if (!inc || inc.status === 'resolved') return 'off';
    const t = now - inc.detectedAt;
    return t >= i * CONFIG.pipelineStepMs ? (i === 2 ? 'bad' : 'on') : 'off';
  };
  const c = common.map((label, i) => ({ label, state: st(i) }));
  let l: { label: string; state: StepState }[] = legit.map((label) => ({ label, state: 'off' as StepState }));
  let tm: { label: string; state: StepState }[] = tamper.map((label) => ({ label, state: 'off' as StepState }));
  if (inc && inc.status !== 'resolved' && now - inc.detectedAt >= 4 * CONFIG.pipelineStepMs) {
    if (inc.kind === 'legit') {
      c[2].state = 'on';
      c[3].state = 'ok';
      l = [
        { label: legit[0], state: 'ok' },
        { label: legit[1], state: inc.status === 'anchored' ? 'seal' : 'off' },
      ];
      tm = tm.map((x) => ({ ...x, state: 'skip' }));
    } else {
      c[3].state = 'bad';
      const s = inc.status;
      tm = [
        { label: tamper[0], state: 'bad' },
        { label: tamper[1], state: now - inc.detectedAt >= 5 * CONFIG.pipelineStepMs ? 'bad' : 'off' },
        { label: tamper[2], state: s === 'repaired' || s === 'sealed' ? 'ok' : 'off' },
        { label: tamper[3], state: (s === 'repaired' || s === 'sealed') && inc.verifiedAfterRepair ? 'ok' : 'off' },
        { label: tamper[4], state: s === 'sealed' ? 'seal' : 'off' },
      ];
      l = l.map((x) => ({ ...x, state: 'skip' }));
    }
  }
  return { c, l, tm };
}

function Step({ label, state, i }: { label: string; state: StepState; i: number }) {
  const cls: Record<StepState, string> = {
    off: 'border-line bg-surface text-muted',
    on: 'border-ink bg-ink text-paper',
    bad: 'border-bad bg-bad text-white',
    ok: 'border-ok bg-ok text-white',
    seal: 'border-seal bg-seal text-white',
    skip: 'border-dashed border-line bg-transparent text-muted/50 line-through',
  };
  return (
    <motion.div layout className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-[15px] font-semibold transition-colors duration-300 ${cls[state]}`}>
      <span className="font-mono text-[14px] opacity-70">{i}</span> {label}
    </motion.div>
  );
}

const PRESETS: ScenarioId[] = ['fare-to-one', 'make-me-admin', 'double-refund'];

export function T5TamperLab() {
  const incident = useSim((s) => s.incident);
  const settings = useSim((s) => s.settings);
  const attacker = useSim((s) => s.attackerMode);
  const journal = useSim((s) => s.journal);
  const watch = useSim((s) => s.watch);
  const s = useSim.getState();
  const now = useNow();
  const p = pipeline(incident, now);
  const proof = incident?.kind === 'tamper' ? incident.proofs[0] : undefined;
  const stage: keyof typeof STAGE_CAPTIONS = !incident || incident.status === 'resolved'
    ? 'waiting'
    : incident.kind === 'legit'
      ? incident.status === 'anchored' ? 'anchored' : 'legit'
      : incident.status === 'detected'
        ? settings.autoRepair ? 'tamper' : 'manual'
        : incident.status === 'sealed' ? 'sealed' : 'repaired';

  return (
    <Section
      n={5}
      title="Tamper Lab"
      lead="Act as an attacker with direct database access. Edit any cell — or make a legitimate change through the app — and watch the watchdog decide, prove and repair."
      plain="This is a sandbox: try to change the data behind our back. If the change came through the app, the app’s own logbook explains it and nothing happens. If it didn’t, the system notices within a second, points at the exact row, puts it back from a locked backup, and writes a receipt nobody can erase."
    >
      <Panel
        title={<Switch checked={attacker} onChange={s.setAttackerMode} label="Act as an attacker with direct database access" />}
        right={
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((id) => (
              <Button key={id} variant="ghost" onClick={() => s.runScenario(id)}>
                {SCENARIOS[id].label}
              </Button>
            ))}
            <Button variant="soft" onClick={() => s.legitWrite()}>
              <ShoppingBag className="size-4" /> Legitimate booking via the app
            </Button>
          </div>
        }
      >
        <RowTable editable={attacker} />
        <p className="mt-3 text-[15px] text-muted">{attacker ? 'Click any value (fare, status, role, payouts…) to edit it directly in the database. Press Enter to save.' : 'Turn on attacker mode to edit cells.'}</p>
      </Panel>

      <Panel
        title="Watchdog pipeline"
        right={
          <span className="text-[16px] text-ink-2">
            <span className="font-semibold">{STAGE_CAPTIONS[stage].technical}</span>
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {p.c.map((x, i) => (
            <Step key={x.label} label={x.label} state={x.state} i={i + 1} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_2fr]">
          <div className="rounded-2xl border border-line p-3">
            <div className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-ok">Legit · journal explains it</div>
            <div className="flex flex-wrap gap-2">
              {p.l.map((x, i) => <Step key={x.label} label={x.label} state={x.state} i={i + 5} />)}
            </div>
          </div>
          <div className="rounded-2xl border border-line p-3">
            <div className="mb-2 text-[14px] font-semibold uppercase tracking-wide text-bad">Tamper · nothing explains it</div>
            <div className="flex flex-wrap gap-2">
              {p.tm.map((x, i) => <Step key={x.label} label={x.label} state={x.state} i={i + 5} />)}
            </div>
          </div>
        </div>
        {incident?.kind === 'tamper' && incident.status === 'detected' && !settings.autoRepair && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-bad-soft p-3.5">
            <span className="text-[16px] font-semibold text-bad">Tamper isolated. Auto-repair is off.</span>
            <Button variant="danger" onClick={s.repairNow}>
              <Wrench className="size-4" /> Repair now
            </Button>
          </motion.div>
        )}
        {incident?.kind === 'tamper' && incident.findingId && incident.status !== 'resolved' && (
          <div className="mt-4 rounded-xl border border-line bg-surface-2 p-3.5 text-[16px] text-ink-2">
            Linked: matches finding <b className="text-ink">{incident.findingId}</b>: {FINDING_LINK_TEXT[incident.findingId]}
            {incident.sealedBlock && <> · receipt in block <b className="text-seal">{fmtBlock(incident.sealedBlock)}</b></>}
          </div>
        )}
      </Panel>

      <Panel title="Merkle tree · red climbs from the changed leaf to the root, repair pulses back down">
        <MerkleTree />
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Merkle proof for the changed row" right={proof && <Badge tone="bad">leaf #{proof.leafIndex} · {proof.rowId}</Badge>}>
          {proof ? (
            <div className="space-y-4 text-[15px]">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border-2 border-bad/60 p-3">
                  <div className="font-semibold text-bad">Leaf from current row</div>
                  <Hash value={proof.tamperedLeaf} n={8} className="text-ink" />
                </div>
                <div className="rounded-xl border-2 border-ok/60 p-3">
                  <div className="font-semibold text-ok">Leaf from vault copy</div>
                  <Hash value={proof.vaultLeaf} n={8} className="text-ink" />
                </div>
              </div>
              <div>
                <div className="mb-1.5 text-[14px] font-semibold uppercase tracking-wide text-muted">Sibling hashes, leaf → root (from the anchored tree)</div>
                <ol className="space-y-1.5">
                  {proof.steps.map((st, i) => (
                    <li key={i} className="grid grid-cols-[auto_1fr_1fr] items-center gap-3 rounded-lg bg-surface-2 px-3 py-1.5 font-mono">
                      <span className="text-muted">L{st.level}</span>
                      <span className="text-ink-2">
                        sibling ({st.side}) <Hash value={st.sibling} n={4} />
                      </span>
                      <span className="flex justify-end gap-3">
                        <span className="text-bad">{proof.tamperedComputed[i].slice(0, 6)}</span>
                        <span className="text-ok">{proof.vaultComputed[i].slice(0, 6)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-bad-soft p-3 font-semibold text-bad">
                  <X className="size-5" /> current row → {proof.tamperedComputed[proof.tamperedComputed.length - 1].slice(0, 8)}… ≠ on-chain
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-ok-soft p-3 font-semibold text-ok">
                  <Check className="size-5" /> vault copy → {proof.vaultComputed[proof.vaultComputed.length - 1].slice(0, 8)}… = on-chain
                </div>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-[16px] text-muted">Tamper with a row to see its proof: the leaf, its 4 sibling hashes, and the recomputed root.</p>
          )}
        </Panel>

        <Panel title="Settings">
          <div className="space-y-5">
            <Switch checked={settings.autoRepair} onChange={(b) => s.setSettings({ autoRepair: b })} label="Auto-repair" />
            <label className="block">
              <span className="flex justify-between text-[15px] font-semibold text-ink">
                Repair delay <span className="font-mono tabular text-ink-2">{(settings.repairDelayMs / 1000).toFixed(1)}s</span>
              </span>
              <input type="range" min={300} max={6000} step={100} value={settings.repairDelayMs} onChange={(e) => s.setSettings({ repairDelayMs: Number(e.target.value) })} className="mt-2 w-full accent-[var(--accent)]" />
            </label>
            <label className="block">
              <span className="flex justify-between text-[15px] font-semibold text-ink">
                Epoch length <span className="font-mono tabular text-ink-2">{settings.epochBlocks} blocks · ~{(settings.epochBlocks * CONFIG.blockMs) / 1000}s</span>
              </span>
              <input type="range" min={1} max={8} step={1} value={settings.epochBlocks} onChange={(e) => s.setSettings({ epochBlocks: Number(e.target.value) })} className="mt-2 w-full accent-[var(--accent)]" />
            </label>
            <Switch checked={settings.chainPaused} onChange={(b) => s.setSettings({ chainPaused: b })} label="Pause block production" />
            <div className="rounded-xl bg-surface-2 p-3 text-[15px] text-ink-2">
              Status: <b>{watch}</b>. Watchdog runs out-of-band with read-only credentials; restores come from the WORM vault.
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Panel title="Authorised change journal (CDC from app DB role)">
          {journal.length === 0 ? (
            <p className="text-[15px] text-muted">No app writes since the last anchor. Press “Legitimate booking via the app”.</p>
          ) : (
            <ul className="max-h-[240px] space-y-2 overflow-y-auto scrollbar-thin">
              {[...journal].reverse().map((j) => (
                <li key={j.id} className="rounded-lg border border-line p-2.5 font-mono text-[14px]">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold text-ink">{j.rowId}</span>
                    <span className={j.anchored ? 'text-seal' : 'text-warn'}>{j.anchored ? 'anchored' : 'pending anchor'}</span>
                  </div>
                  <div className="text-ink-2">
                    actor {j.actor} · {j.txId}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Chain">
          <BlockStrip count={10} />
        </Panel>
      </div>
    </Section>
  );
}

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ReactFlow, Background, Handle, Position, MarkerType, type Edge, type Node, type NodeProps } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X } from 'lucide-react';
import { useSim } from '../../sim/store';
import { Section } from './shared';
import { Button } from '../../components/ui';

type Group = 'hunt' | 'prove' | 'protect' | 'ext';

interface Info {
  label: string;
  group: Group;
  does: string;
  inputs: string;
  outputs: string;
  plain: string;
}

const INFO: Record<string, Info> = {
  triggers: { label: 'Change triggers', group: 'hunt', does: 'Listens for CI/CD deploy webhooks, new JS bundles, new endpoints seen in gateway traffic and new subdomains (DNS/certificate watcher).', inputs: 'Webhooks, bundle diffs, gateway logs, DNS', outputs: 'Change event → orchestrator', plain: 'A doorbell that rings every time the platform changes.' },
  orch: { label: 'Orchestrator', group: 'hunt', does: 'Decides what to test and in what order; pauses everything when the safety layer raises an alarm.', inputs: 'Change events, safety alarms, human decisions', outputs: 'Jobs for recon, planner, executors', plain: 'The team lead who decides who does what, and when to stop.' },
  recon: { label: 'Recon / Inventory', group: 'hunt', does: 'Crawls the UI as each role, reads HAR traffic and JS bundles for routes, compares against 90 days of gateway logs → active / zombie / shadow. Emits an OpenAPI spec.', inputs: 'Test accounts, HAR, bundles, 90-day logs', outputs: 'Endpoint inventory, OpenAPI', plain: 'Draws a map of every door in the building — including forgotten ones.' },
  kg: { label: 'Knowledge graph', group: 'hunt', does: 'Stores endpoints, params, roles and business flows (search → hold → book → pay → cancel → refund).', inputs: 'Recon output', outputs: 'Context for planning', plain: 'The map, plus notes on what each door is for.' },
  planner: { label: 'LLM attack planner', group: 'hunt', does: 'Reasons over the graph to pick targeted tests per endpoint, and says why it skipped others.', inputs: 'Knowledge graph, changed endpoints', outputs: 'Test plan with reasoning', plain: 'Picks the few tricks worth trying on each door, instead of all of them.' },
  safety: { label: 'Safety layer', group: 'hunt', does: 'Scope allowlist · rate limit · health backoff · kill switch · human-approval queue · test-credential vault.', inputs: 'Every executor request', outputs: 'Allowed / blocked / paused', plain: 'Guard rails so testing never hurts the real platform.' },
  exec: { label: 'Executor agents', group: 'hunt', does: 'Specialists for IDOR, fare/markup tampering, refund replay, role escalation, JWT, injection, mass assignment.', inputs: 'Test plan, test credentials', outputs: 'Raw hits', plain: 'Specialists who each try one kind of trick, carefully.' },
  app: { label: 'TripGrid (staging)', group: 'ext', does: 'The production-like platform under test.', inputs: 'Scoped, rate-limited requests', outputs: 'Responses + DB state changes', plain: 'The platform we are protecting.' },
  human: { label: 'Human reviewer', group: 'ext', does: 'Approves risky tests and checks high-severity findings before escalation.', inputs: 'Approval queue', outputs: 'Approve / deny', plain: 'A person signs off before anything risky happens.' },
  ledger: { label: 'Integrity Ledger', group: 'prove', does: 'Merkle tree over watched rows. Root before vs after each attack → exact row diff.', inputs: 'DB rows (read-only replica)', outputs: 'Roots, proofs, row diffs', plain: 'Fingerprints the data so we can see exactly what an attack changed.' },
  verifier: { label: 'Verifier', group: 'prove', does: 'Confirms each hit with minimal evidence and a state-change proof; auto-reverts test writes.', inputs: 'Raw hits, ledger roots', outputs: 'Verified findings', plain: 'Throws away anything that isn’t provably real.' },
  triage: { label: 'Triage', group: 'prove', does: 'Merges duplicates, scores severity in business context, maps to owners.', inputs: 'Verified findings, ownership data', outputs: 'Ranked findings', plain: 'Decides how bad it is for this business and whose desk it lands on.' },
  reporter: { label: 'Reporter / tickets', group: 'prove', does: 'Raises tickets with evidence, impact, owner and a suggested fix.', inputs: 'Ranked findings', outputs: 'Tickets', plain: 'Writes a ticket a developer can act on immediately.' },
  retest: { label: 'Retest', group: 'prove', does: 'Reruns the proof after a fix deploy and closes the finding.', inputs: 'Fix deploy events', outputs: 'Closed findings', plain: 'Checks the fix actually worked.' },
  anchor: { label: 'IntegrityAnchor contract', group: 'prove', does: 'anchor(epoch, merkleRoot, auditHead) and repairReceipt(epoch, rowIds, restoredRoot). Hashes only.', inputs: 'Roots, audit head, receipts', outputs: 'On-chain transactions', plain: 'Writes fingerprints where nobody can change them.' },
  chain: { label: 'EVM chain', group: 'prove', does: 'Anvil locally; a public L2 in production, one anchor tx per epoch.', inputs: 'Anchor txs', outputs: 'Immutable timeline', plain: 'The public notice board.' },
  watchdog: { label: 'Watchdog', group: 'protect', does: 'Separate host, read-only creds. Recomputes the tree, compares with the anchored root, checks the change journal, repairs tamper.', inputs: 'Replica rows, CDC journal, anchored root', outputs: 'Alerts, repairs, receipts', plain: 'A guard on another machine that notices unexplained changes.' },
  vault: { label: 'WORM snapshot vault', group: 'protect', does: 'Encrypted write-once snapshots of the last anchored row states.', inputs: 'Anchored snapshots', outputs: 'Rows to restore', plain: 'A locked backup nobody can overwrite.' },
};

const POS: Record<string, [number, number]> = {
  triggers: [20, 50],
  orch: [235, 50],
  human: [665, 50],
  recon: [20, 160],
  kg: [235, 160],
  planner: [450, 160],
  safety: [430, 255],
  app: [700, 280],
  ledger: [20, 445],
  verifier: [235, 445],
  triage: [450, 445],
  reporter: [665, 445],
  retest: [665, 540],
  anchor: [235, 540],
  chain: [450, 540],
  watchdog: [20, 690],
  vault: [235, 690],
};

const EDGES: [string, string, string][] = [
  ['triggers-orch', 'triggers', 'orch'],
  ['orch-recon', 'orch', 'recon'],
  ['recon-kg', 'recon', 'kg'],
  ['kg-planner', 'kg', 'planner'],
  ['planner-exec', 'planner', 'exec'],
  ['exec-safety', 'exec', 'safety'],
  ['safety-app', 'safety', 'app'],
  ['human-orch', 'human', 'orch'],
  ['exec-verifier', 'exec', 'verifier'],
  ['verifier-ledger', 'verifier', 'ledger'],
  ['verifier-triage', 'verifier', 'triage'],
  ['triage-reporter', 'triage', 'reporter'],
  ['reporter-retest', 'reporter', 'retest'],
  ['retest-verifier', 'retest', 'verifier'],
  ['ledger-anchor', 'ledger', 'anchor'],
  ['anchor-chain', 'anchor', 'chain'],
  ['watchdog-vault', 'watchdog', 'vault'],
  ['watchdog-anchor', 'watchdog', 'anchor'],
];

const GROUP_STYLE: Record<Group, string> = {
  hunt: 'border-ink/70',
  prove: 'border-seal',
  protect: 'border-ok',
  ext: 'border-dashed border-line-2',
};

function ArchNode({ id, data, selected }: NodeProps) {
  const d = data as { info: Info; hot: boolean };
  return (
    <div className={`relative rounded-xl border-2 bg-surface px-3 py-2.5 text-[16px] font-semibold leading-tight text-ink shadow-card transition ${GROUP_STYLE[d.info.group]} ${selected ? 'ring-2 ring-accent ring-offset-2 ring-offset-paper' : ''} ${d.hot ? 'scale-[1.04]' : ''}`} style={{ width: id === 'exec' ? 165 : 172 }}>
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-line-2" />
      <Handle type="target" position={Position.Top} id="t" className="!size-2 !border-0 !bg-line-2" />
      {d.hot && <span className="absolute -right-1.5 -top-1.5 size-3 animate-ping rounded-full bg-accent" />}
      {d.info.label}
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-line-2" />
      <Handle type="source" position={Position.Bottom} id="b" className="!size-2 !border-0 !bg-line-2" />
    </div>
  );
}

function SafetyNode({ data, selected }: NodeProps) {
  const d = data as { info: Info; hot: boolean };
  return (
    <div className={`h-full w-full rounded-2xl border-2 border-dashed border-warn bg-warn-soft/60 ${selected ? 'ring-2 ring-accent' : ''}`}>
      <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-warn" />
      <div className="px-3 pt-1.5 text-[14px] font-bold uppercase tracking-wide text-warn">{d.info.label}</div>
      <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-warn" />
    </div>
  );
}

function BandNode({ data }: NodeProps) {
  const d = data as { label: string; tone: string };
  return (
    <div className={`h-full w-full rounded-3xl border ${d.tone}`}>
      <div className="px-5 pt-3 font-display text-[18px] font-extrabold uppercase tracking-widest opacity-80">{d.label}</div>
    </div>
  );
}

const nodeTypes = { arch: ArchNode, safety: SafetyNode, band: BandNode };

export function T1Architecture() {
  const flow = useSim((s) => s.flowEdges);
  const sc = useSim((s) => s.scenario);
  const [sel, setSel] = useState<string | null>(null);

  const hotNodes = new Set(flow.flatMap((e) => EDGES.find((x) => x[0] === e)?.slice(1) ?? []));

  const nodes: Node[] = useMemo(() => {
    const bands: Node[] = [
      { id: 'band-hunt', type: 'band', position: { x: 0, y: 0 }, data: { label: 'Hunt', tone: 'border-line-2 bg-surface-2/60 text-ink' }, style: { width: 880, height: 380 }, selectable: false, draggable: false, zIndex: -1 },
      { id: 'band-prove', type: 'band', position: { x: 0, y: 400 }, data: { label: 'Prove', tone: 'border-seal/30 bg-seal-soft/50 text-seal' }, style: { width: 880, height: 220 }, selectable: false, draggable: false, zIndex: -1 },
      { id: 'band-protect', type: 'band', position: { x: 0, y: 640 }, data: { label: 'Protect', tone: 'border-ok/30 bg-ok-soft/50 text-ok' }, style: { width: 880, height: 130 }, selectable: false, draggable: false, zIndex: -1 },
    ];
    const ns: Node[] = Object.entries(POS).map(([id, [x, y]]) =>
      id === 'safety'
        ? { id, type: 'safety', position: { x, y }, data: { info: INFO[id], hot: hotNodes.has(id) }, style: { width: 250, height: 100 }, draggable: false }
        : { id, type: 'arch', position: { x, y }, data: { info: INFO[id], hot: hotNodes.has(id) }, draggable: false },
    );
    ns.push({ id: 'exec', type: 'arch', parentId: 'safety', extent: 'parent', position: { x: 42, y: 38 }, data: { info: INFO.exec, hot: hotNodes.has('exec') }, draggable: false });
    return [...bands, ...ns];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.join('|')]);

  const edges: Edge[] = EDGES.map(([id, source, target]) => {
    const hot = flow.includes(id);
    const vertical = POS[target] && POS[source] && POS[target][1] - POS[source][1] > 60 && Math.abs(POS[target][0] - POS[source][0]) < 60;
    return {
      id,
      source,
      target,
      sourceHandle: vertical ? 'b' : undefined,
      targetHandle: vertical ? 't' : undefined,
      animated: hot,
      type: 'smoothstep',
      style: { stroke: hot ? 'var(--accent)' : 'var(--line-2)', strokeWidth: hot ? 3 : 1.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color: hot ? 'var(--accent)' : 'var(--line-2)' },
      zIndex: hot ? 5 : 0,
    };
  });

  const info = sel ? INFO[sel] : null;

  return (
    <Section
      n={1}
      title="Architecture"
      lead="Three pillars, one loop. Hunt finds the bug after every change, Prove makes the evidence undeniable, Protect seals the data and repairs tampering."
      plain="Think of it as a building with a security team. Some people try every door after renovations (Hunt), a notary records exactly what changed (Prove), and a guard on another floor notices if anything is moved without paperwork (Protect). Click any box to see what it does."
      aside={
        <div className="flex flex-wrap gap-2">
          <Button variant="soft" onClick={() => useSim.getState().runScenario('peek-other-agency')}>Animate a Hunt flow</Button>
          <Button variant="ghost" onClick={() => useSim.getState().runScenario('fare-to-one')}>Animate a Protect flow</Button>
        </div>
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface">
        <div className="h-[560px] w-full md:h-[760px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.03 }}
            minZoom={0.3}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, n) => (n.type === 'band' ? undefined : setSel(n.id))}
            onPaneClick={() => setSel(null)}
            nodesConnectable={false}
            panOnScroll={false}
            zoomOnScroll={false}
            preventScrolling={false}
          >
            <Background gap={24} size={1} color="var(--line)" />
          </ReactFlow>
        </div>
        {sc && flow.length > 0 && (
          <div className="absolute left-4 top-4 rounded-full bg-ink px-3.5 py-1.5 text-[14px] font-semibold text-paper">Live: {sc.id}</div>
        )}
        <AnimatePresence>
          {info && (
            <motion.div
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              className="absolute bottom-3 right-3 top-3 w-[min(360px,calc(100%-24px))] overflow-y-auto rounded-2xl border border-line bg-surface p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[14px] font-semibold uppercase tracking-wider text-accent">{info.group === 'ext' ? 'External' : info.group}</div>
                  <h3 className="font-display text-[24px] font-bold leading-tight text-ink">{info.label}</h3>
                </div>
                <button onClick={() => setSel(null)} aria-label="Close panel" className="grid size-9 place-items-center rounded-lg hover:bg-surface-2">
                  <X className="size-4" />
                </button>
              </div>
              <p className="mt-3 text-[16px] leading-relaxed text-ink-2">{info.does}</p>
              <dl className="mt-4 space-y-2 text-[15px]">
                <div><dt className="font-semibold text-muted">Inputs</dt><dd className="text-ink">{info.inputs}</dd></div>
                <div><dt className="font-semibold text-muted">Outputs</dt><dd className="text-ink">{info.outputs}</dd></div>
              </dl>
              <div className="mt-4 rounded-xl bg-warn-soft p-3.5 text-[16px] text-ink-2">
                <span className="font-semibold text-warn">In plain words: </span>
                {info.plain}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Section>
  );
}

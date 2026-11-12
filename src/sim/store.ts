// The single simulation store. Both modes render this same state.
import { create } from 'zustand';
import {
  buildTreeFromRows,
  canonicalJSON,
  chainEntryHash,
  diffWalk,
  leafHash,
  merkleProof,
  rootOf,
  verifyProof,
  ZERO_HASH,
  type Levels,
  type ProofStep,
  type WalkNode,
} from './crypto';
import { MockChain, type Block, type PendingTx } from './chain';
import {
  ROW_IDS,
  SEED,
  SEED_AUDIT,
  SEED_FINDINGS,
  SEED_ROWS,
  type AuditEntry,
  type Finding,
  type Row,
} from './seed';
import { CONFIG, SCENARIOS, type ScenarioAction, type ScenarioId } from './scenarios';

// ------------------------------------------------------------------ types

export type Mode = 'overview' | 'tech';
export type Watch = 'intact' | 'verifying' | 'tamper' | 'repaired' | 'pending';
export type EventLevel = 'info' | 'ok' | 'warn' | 'alert' | 'chain';

export interface SimEvent {
  id: number;
  t: number;
  level: EventLevel;
  pillar: 'hunt' | 'prove' | 'protect' | 'system';
  text: string;
}

export interface JournalEntry {
  id: number;
  rowId: string;
  before: Row;
  after: Row;
  actor: string;
  txId: string;
  time: number;
  anchored: boolean;
}

export interface FieldChange {
  rowId: string;
  field: string;
  before: string | number;
  after: string | number;
}

export interface RowProof {
  rowId: string;
  leafIndex: number;
  tamperedLeaf: string;
  vaultLeaf: string;
  steps: ProofStep[];
  anchoredRoot: string;
  tamperedComputed: string[];
  vaultComputed: string[];
  tamperedOk: boolean;
  vaultOk: boolean;
}

export type IncidentStatus = 'detected' | 'repaired' | 'sealed' | 'resolved' | 'legit' | 'anchored';

export interface Incident {
  id: number;
  kind: 'tamper' | 'legit';
  status: IncidentStatus;
  rowIds: string[];
  changes: FieldChange[];
  startedAt: number;
  detectedAt: number;
  repairedAt?: number;
  sealedBlock?: number;
  anchoredBlock?: number;
  visited: WalkNode[];
  proofs: RowProof[];
  findingId?: string;
  verifiedAfterRepair?: boolean;
}

export interface AuditRecord {
  entry: AuditEntry;
  prevHash: string;
  hash: string;
}

export interface AuditVerify {
  results: ('ok' | 'broken')[];
  headOk: boolean;
  recomputedAnchored: string;
  ranAt: number;
}

export interface Approval {
  id: number;
  test: string;
  endpoint: string;
  risk: string;
  status: 'pending' | 'approved' | 'denied';
}

export interface ProofState {
  phase: 'idle' | 'before' | 'attacked' | 'reverted';
  beforeRoot?: string;
  afterRoot?: string;
  revertedRoot?: string;
  diff?: string;
}

export interface Hunt {
  version: string;
  deployStage: number; // 0 idle, 1 detected, 2 inventory, 3 planned, 4 executing, 5 proven, 6 reverted, 7 ticketed
  deployStartedAt?: number;
  deployFindingAt?: number;
  inventoryScanned: boolean;
  plannerEndpoint: string;
  execLog: { t: number; text: string; level: EventLevel }[];
  executing: boolean;
  rps: number;
  rpsLimit: number;
  latency: number;
  backoff: boolean;
  killed: boolean;
  approvals: Approval[];
  proof: ProofState;
  retesting: string | null;
}

export interface ActiveScenario {
  id: ScenarioId;
  runId: number;
  startedAt: number;
  stepIdx: number;
  done: boolean;
  incidentId?: number;
  sealBlock?: number;
  caughtMs?: number;
}

export interface Settings {
  autoRepair: boolean;
  repairDelayMs: number;
  epochBlocks: number;
  chainPaused: boolean;
}

export interface SimState {
  ready: boolean;
  gen: number;
  mode: Mode;
  section: string;
  theme: 'light' | 'dark';
  feedOpen: boolean;

  rows: Row[];
  originalRows: Row[];
  vault: Row[];
  levels: Levels;
  anchoredLevels: Levels;
  anchoredRoot: string;
  anchoredAuditHead: string;
  anchoredAuditIndex: number;
  anchoredBlock: number;
  epoch: number;
  blocksSinceAnchor: number;
  pendingAnchor: string[];
  journal: JournalEntry[];
  watch: Watch;
  incident: Incident | null;
  incidents: Incident[];
  blocks: Block[];
  pendingTxs: PendingTx[];
  forceAnchor: boolean;
  lastVerify: { ms: number; root: string; match: boolean; at: number } | null;

  audit: AuditRecord[];
  auditEdited: number | null;
  auditVerify: AuditVerify | null;

  findings: Finding[];
  events: SimEvent[];
  settings: Settings;
  hunt: Hunt;
  scenario: ActiveScenario | null;
  flowEdges: string[];
  attackerMode: boolean;

  // actions
  init: () => Promise<void>;
  reset: () => Promise<void>;
  setMode: (m: Mode) => void;
  setSection: (s: string) => void;
  toggleTheme: () => void;
  setFeedOpen: (b: boolean) => void;
  editCell: (rowId: string, field: string, value: string | number) => void;
  legitWrite: () => void;
  repairNow: () => void;
  verifyRoot: () => Promise<void>;
  runScenario: (id: ScenarioId) => void;
  stopScenario: () => void;
  setSettings: (p: Partial<Settings>) => void;
  setAttackerMode: (b: boolean) => void;
  coverUp: (index: number) => void;
  restoreAudit: () => void;
  verifyAudit: () => Promise<void>;
  retest: (findingId: string) => void;
  replayProof: () => void;
  setPlannerEndpoint: (id: string) => void;
  decideApproval: (id: number, ok: boolean) => void;
  setKill: (b: boolean) => void;
  spikeLatency: () => void;
  startExecutors: () => void;
}

// ------------------------------------------------------------------ module-level engine plumbing

let chain = new MockChain(SEED);
let timers = new Set<number>();
let blockTimer: number | null = null;
let recomputeSeq = 0;
let repairTimer: number | null = null;
let eventId = 0;
let incidentId = 0;
let journalId = 0;
let approvalId = 0;
let scenarioRun = 0;
let scenarioTimers: number[] = [];
let initToken = 0;

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

function later(fn: () => void, ms: number): number {
  const gen = useSim.getState().gen;
  const id = window.setTimeout(() => {
    timers.delete(id);
    if (useSim.getState().gen === gen) fn();
  }, ms);
  timers.add(id);
  return id;
}

function clearAllTimers() {
  timers.forEach((t) => window.clearTimeout(t));
  timers = new Set();
  if (blockTimer) window.clearInterval(blockTimer);
  blockTimer = null;
  repairTimer = null;
  scenarioTimers = [];
}

const sameRow = (a: Row, b: Row) => canonicalJSON(a) === canonicalJSON(b);
const rowById = (rows: Row[], id: string) => rows.find((r) => r.id === id)!;

function fieldChanges(before: Row, after: Row): FieldChange[] {
  const out: FieldChange[] = [];
  const a = before as unknown as Record<string, string | number>;
  const b = after as unknown as Record<string, string | number>;
  for (const k of Object.keys(b)) if (a[k] !== b[k]) out.push({ rowId: after.id, field: k, before: a[k], after: b[k] });
  return out;
}

function findingForChange(c: FieldChange): string | undefined {
  if (c.rowId.startsWith('b-') && c.field === 'fare') return 'F-09';
  if (c.rowId.startsWith('u-') && c.field === 'role') return 'F-12';
  if (c.rowId.startsWith('r-')) return 'F-07';
  return undefined;
}

export const FINDING_LINK_TEXT: Record<string, string> = {
  'F-12': 'sub-agent → admin via PATCH /users/{id}',
  'F-09': 'fare trusted from client on POST /bookings/{id}/confirm',
  'F-07': 'refund replay on POST /refunds',
};

function emit(level: EventLevel, pillar: SimEvent['pillar'], text: string) {
  useSim.setState((s) => ({ events: [{ id: ++eventId, t: Date.now(), level, pillar, text }, ...s.events].slice(0, 160) }));
}

function execLog(text: string, level: EventLevel = 'info') {
  useSim.setState((s) => ({ hunt: { ...s.hunt, execLog: [...s.hunt.execLog, { t: Date.now(), text, level }].slice(-60) } }));
}

function patchHunt(p: Partial<Hunt>) {
  useSim.setState((s) => ({ hunt: { ...s.hunt, ...p } }));
}

async function appendAudit(e: Omit<AuditEntry, 'seq'>) {
  const s = useSim.getState();
  const prev = s.audit.length ? s.audit[s.audit.length - 1].hash : ZERO_HASH;
  const entry: AuditEntry = { seq: s.audit.length + 1, ...e };
  const hash = await chainEntryHash(prev, entry);
  useSim.setState((st) => ({ audit: [...st.audit, { entry, prevHash: prev, hash }] }));
}

function nowClock(): string {
  const d = new Date();
  return d.toTimeString().slice(0, 8);
}

/** The row value the watchdog should restore: last journal-approved value, else the vault. */
function restoreTarget(s: SimState, rowId: string): Row {
  const entries = s.journal.filter((j) => j.rowId === rowId && !j.anchored);
  if (entries.length) return entries[entries.length - 1].after;
  return rowById(s.vault, rowId);
}

function journalExplains(s: SimState, row: Row): boolean {
  const entries = s.journal.filter((j) => j.rowId === row.id && !j.anchored);
  if (!entries.length) return false;
  if (!sameRow(entries[0].before, rowById(s.vault, row.id))) return false;
  for (let i = 1; i < entries.length; i++) if (!sameRow(entries[i].before, entries[i - 1].after)) return false;
  return sameRow(entries[entries.length - 1].after, row);
}

// ------------------------------------------------------------------ watchdog

async function recompute(startedAt = Date.now()) {
  const seq = ++recomputeSeq;
  const gen = useSim.getState().gen;
  if (useSim.getState().watch !== 'tamper') useSim.setState({ watch: 'verifying' });
  await wait(CONFIG.verifyMs);
  if (seq !== recomputeSeq || gen !== useSim.getState().gen) return;

  const s = useSim.getState();
  const levels = await buildTreeFromRows(s.rows);
  if (seq !== recomputeSeq || gen !== useSim.getState().gen) return;
  const root = rootOf(levels);

  if (root === s.anchoredRoot) {
    // Everything matches the anchor (including "edited back before repair").
    if (repairTimer) {
      window.clearTimeout(repairTimer);
      timers.delete(repairTimer);
      repairTimer = null;
    }
    const inc = s.incident;
    let incident = inc;
    if (inc && (inc.status === 'detected' || inc.status === 'legit')) {
      incident = { ...inc, status: 'resolved' };
      emit(
        'ok',
        'protect',
        inc.kind === 'tamper' ? 'Change reverted before repair — root matches the anchored root again.' : 'Pending change netted out — root matches the anchored root again. Nothing to anchor.',
      );
    }
    // journal entries that netted out are now moot
    useSim.setState({
      levels,
      pendingAnchor: [],
      journal: s.journal.map((j) => (j.anchored ? j : { ...j, anchored: true })),
      watch: inc && inc.status === 'sealed' ? 'repaired' : 'intact',
      incident,
    });
    return;
  }

  const { visited, changedLeaves } = diffWalk(levels, s.anchoredLevels);
  const changedRows = changedLeaves.map((i) => s.rows[i]);
  const legit = changedRows.filter((r) => journalExplains(s, r));
  const tampered = changedRows.filter((r) => !journalExplains(s, r));

  if (!tampered.length) {
    const prevInc = s.incident;
    const isNew = !prevInc || prevInc.kind !== 'legit' || prevInc.status !== 'legit';
    const changes = legit.flatMap((r) => fieldChanges(rowById(s.vault, r.id), r));
    const incident: Incident = isNew
      ? { id: ++incidentId, kind: 'legit', status: 'legit', rowIds: legit.map((r) => r.id), changes, startedAt, detectedAt: Date.now(), visited, proofs: [] }
      : { ...prevInc!, rowIds: legit.map((r) => r.id), changes, visited };
    if (repairTimer) {
      window.clearTimeout(repairTimer);
      repairTimer = null;
    }
    useSim.setState({ levels, pendingAnchor: legit.map((r) => r.id), watch: 'pending', incident });
    if (isNew) {
      emit('info', 'protect', `Root changed · journal explains ${legit.map((r) => r.id).join(', ')} → queued for next anchor. No alert.`);
      useSim.setState((st) => ({ incidents: [incident, ...st.incidents].slice(0, 20) }));
    }
    return;
  }

  // ---- tamper
  const proofs: RowProof[] = [];
  for (const r of tampered) {
    const idx = ROW_IDS.indexOf(r.id);
    const steps = merkleProof(s.anchoredLevels, idx);
    const tamperedLeaf = levels[0][idx];
    const vaultLeaf = s.anchoredLevels[0][idx];
    const t = await verifyProof(tamperedLeaf, steps, s.anchoredRoot);
    const v = await verifyProof(vaultLeaf, steps, s.anchoredRoot);
    proofs.push({
      rowId: r.id,
      leafIndex: idx,
      tamperedLeaf,
      vaultLeaf,
      steps,
      anchoredRoot: s.anchoredRoot,
      tamperedComputed: t.computed,
      vaultComputed: v.computed,
      tamperedOk: t.ok,
      vaultOk: v.ok,
    });
  }
  if (seq !== recomputeSeq || gen !== useSim.getState().gen) return;

  const changes = tampered.flatMap((r) => fieldChanges(restoreTarget(s, r.id), r));
  const findingId = changes.map(findingForChange).find(Boolean);
  const prev = s.incident;
  const continuing = prev && prev.kind === 'tamper' && prev.status === 'detected';
  const incident: Incident = continuing
    ? { ...prev!, rowIds: tampered.map((r) => r.id), changes, visited, proofs, findingId: findingId ?? prev!.findingId }
    : {
        id: ++incidentId,
        kind: 'tamper',
        status: 'detected',
        rowIds: tampered.map((r) => r.id),
        changes,
        startedAt,
        detectedAt: Date.now(),
        visited,
        proofs,
        findingId,
      };
  useSim.setState((st) => ({
    levels,
    pendingAnchor: legit.map((r) => r.id),
    watch: 'tamper',
    incident,
    incidents: continuing ? st.incidents.map((i) => (i.id === incident.id ? incident : i)) : [incident, ...st.incidents].slice(0, 20),
  }));
  if (!continuing) {
    const c = changes[0];
    emit('alert', 'protect', `TAMPER: ${c ? `${c.rowId}.${c.field} ${c.before} → ${c.after}` : tampered[0].id} · no journal entry explains it.`);
    emit('alert', 'protect', `Merkle walk: ${visited.filter((v) => v.mismatch).length} mismatched nodes, pinpointed leaf #${proofs[0].leafIndex} (${proofs[0].rowId}).`);
  }
  const st = useSim.getState();
  if (st.settings.autoRepair && !repairTimer) {
    repairTimer = later(() => {
      repairTimer = null;
      void doRepair();
    }, st.settings.repairDelayMs);
  }
}

async function doRepair() {
  const s = useSim.getState();
  const inc = s.incident;
  if (!inc || inc.kind !== 'tamper' || inc.status !== 'detected') return;
  const ids = inc.rowIds;
  const rows = s.rows.map((r) => (ids.includes(r.id) ? restoreTarget(s, r.id) : r));
  const levels = await buildTreeFromRows(rows);
  const root = rootOf(levels);
  // Re-verify: each repaired leaf must equal its anchored (or journal-approved) leaf.
  let ok = true;
  for (const id of ids) {
    const idx = ROW_IDS.indexOf(id);
    const expected = await leafHash(restoreTarget(s, id));
    if (levels[0][idx] !== expected) ok = false;
  }
  const rootMatches = root === s.anchoredRoot;
  const repaired: Incident = { ...inc, status: 'repaired', repairedAt: Date.now(), verifiedAfterRepair: ok };
  recomputeSeq++; // invalidate any in-flight recompute
  useSim.setState((st) => ({
    rows,
    levels,
    watch: rootMatches ? 'repaired' : 'pending',
    incident: repaired,
    incidents: st.incidents.map((i) => (i.id === repaired.id ? repaired : i)),
    pendingTxs: [
      ...st.pendingTxs,
      { kind: 'repair', method: 'repairReceipt', args: { epoch: st.epoch, rowIds: ids, restoredRoot: root } },
    ],
  }));
  emit('ok', 'protect', `Restored ${ids.join(', ')} from WORM vault in ${((repaired.repairedAt! - inc.startedAt) / 1000).toFixed(1)}s · ${rootMatches ? 'root matches on-chain anchor ✓' : 'remaining diff explained by journal ✓'}`);
  if (inc.findingId) emit('info', 'hunt', `Linked: matches finding ${inc.findingId}: ${FINDING_LINK_TEXT[inc.findingId] ?? ''}`);
  const sc = useSim.getState().scenario;
  if (sc && sc.incidentId === inc.id) useSim.setState({ scenario: { ...sc, caughtMs: repaired.repairedAt! - inc.startedAt } });
}

// ------------------------------------------------------------------ chain ticking

async function mineBlock() {
  const s = useSim.getState();
  const gen = s.gen;
  const pending = [...s.pendingTxs];
  const nextEpochDue = s.blocksSinceAnchor + 1 >= s.settings.epochBlocks;
  const tamperActive = (s.incident?.kind === 'tamper' && s.incident.status === 'detected') || s.hunt.proof.phase === 'before' || s.hunt.proof.phase === 'attacked';
  const auditHead = s.audit.length ? s.audit[s.audit.length - 1].hash : ZERO_HASH;
  const root = rootOf(s.levels);
  const rootChanged = root !== s.anchoredRoot;
  const auditChanged = auditHead !== s.anchoredAuditHead && s.auditEdited === null;
  let anchorThis = false;
  if ((nextEpochDue || s.forceAnchor) && !tamperActive && (rootChanged || auditChanged || s.forceAnchor)) {
    anchorThis = true;
    pending.push({ kind: s.forceAnchor && !rootChanged ? 'evidence' : 'anchor', method: 'anchor', args: { epoch: s.epoch + 1, merkleRoot: root, auditHead } });
  }
  const block = await chain.mine(pending, Date.now());
  if (gen !== useSim.getState().gen) return;

  const st = useSim.getState();
  const patch: Partial<SimState> = {
    blocks: [...chain.blocks],
    pendingTxs: st.pendingTxs.slice(s.pendingTxs.length),
    blocksSinceAnchor: anchorThis ? 0 : nextEpochDue ? 0 : st.blocksSinceAnchor + 1,
  };
  let incident = st.incident;
  let scenario = st.scenario;
  if (pending.some((p) => p.kind === 'repair') && incident && incident.status === 'repaired') {
    incident = { ...incident, status: 'sealed', sealedBlock: block.number };
    emit('chain', 'prove', `Block #${block.number.toLocaleString('en-US')}: IntegrityAnchor.repairReceipt(${incident.rowIds.join(', ')}) sealed.`);
    if (scenario && scenario.incidentId === incident.id) scenario = { ...scenario, sealBlock: block.number, done: true };
    later(() => {
      const cur = useSim.getState();
      if (cur.watch === 'repaired') useSim.setState({ watch: 'intact' });
    }, CONFIG.sealedHoldMs);
  }
  if (anchorThis) {
    const anchoredLevels = await buildTreeFromRows(st.rows);
    patch.vault = st.rows.map((r) => ({ ...r }));
    patch.anchoredLevels = anchoredLevels;
    patch.anchoredRoot = rootOf(anchoredLevels);
    patch.anchoredAuditHead = auditHead;
    patch.anchoredAuditIndex = s.audit.length - 1;
    patch.anchoredBlock = block.number;
    patch.epoch = st.epoch + 1;
    patch.pendingAnchor = [];
    patch.journal = st.journal.map((j) => ({ ...j, anchored: true }));
    patch.forceAnchor = false;
    if (incident && incident.kind === 'legit' && incident.status === 'legit') {
      incident = { ...incident, status: 'anchored', anchoredBlock: block.number };
      if (scenario && scenario.id === 'legit-booking') scenario = { ...scenario, sealBlock: block.number, done: true };
    }
    if (scenario && scenario.id === 'peek-other-agency' && !scenario.sealBlock && s.forceAnchor) scenario = { ...scenario, sealBlock: block.number, done: true };
    if (st.watch === 'pending') patch.watch = 'intact';
    emit('chain', 'prove', `Block #${block.number.toLocaleString('en-US')}: anchor(epoch ${st.epoch + 1}, root ${patch.anchoredRoot.slice(0, 4)}…, auditHead ${auditHead.slice(0, 4)}…)`);
  }
  patch.incident = incident;
  patch.scenario = scenario;
  if (incident) patch.incidents = st.incidents.map((i) => (i.id === incident!.id ? incident! : i));
  useSim.setState(patch);
}

function startChain() {
  if (blockTimer) window.clearInterval(blockTimer);
  blockTimer = window.setInterval(() => {
    if (!useSim.getState().settings.chainPaused) void mineBlock();
  }, CONFIG.blockMs);
}

// ------------------------------------------------------------------ scenario actions

async function applyAction(a: ScenarioAction) {
  const s = useSim.getState();
  switch (a.type) {
    case 'tamper': {
      const row = rowById(s.rows, a.rowId);
      const next = { ...row, ...a.patch } as Row;
      const startedAt = Date.now();
      useSim.setState({ rows: s.rows.map((r) => (r.id === a.rowId ? next : r)) });
      emit('warn', 'protect', `Direct DB write: ${fieldChanges(row, next).map((c) => `${c.rowId}.${c.field} ${c.before} → ${c.after}`).join(', ')}`);
      await recompute(startedAt);
      const inc = useSim.getState().incident;
      const sc = useSim.getState().scenario;
      if (sc && inc) useSim.setState({ scenario: { ...sc, incidentId: inc.id } });
      break;
    }
    case 'legit':
      useSim.getState().legitWrite();
      break;
    case 'idor-request':
      await appendAudit({ ts: nowClock(), agent: 'idor', method: 'GET', path: '/v3/bookings/b-1005', status: 200, note: 'swap id as Skyline test user' });
      emit('warn', 'hunt', 'IDOR executor: GET /v3/bookings/b-1005 with Skyline token → 200 OK');
      break;
    case 'idor-verify':
      emit('ok', 'hunt', 'Verifier: response agency = BlueOrbit ≠ caller agency = Skyline. Confirmed with 1 redacted record.');
      break;
    case 'idor-file': {
      useSim.setState((st) => ({
        findings: st.findings.map((f) => (f.id === 'F-04' ? { ...f, status: 'open', duplicatesMerged: f.duplicatesMerged + 1 } : f)),
        forceAnchor: true,
      }));
      emit('info', 'hunt', 'Triage: F-04 (high) · duplicate merged · ticket → Booking team.');
      break;
    }
    case 'deploy-detect':
      patchHunt({ version: 'v2.14.0', deployStage: 1, deployStartedAt: Date.now(), deployFindingAt: undefined, inventoryScanned: false, execLog: [], proof: { phase: 'idle' } });
      emit('info', 'hunt', 'Change detected: CI/CD webhook · tripgrid-api v2.14.0 · new bundle main.8f2c.js');
      break;
    case 'inventory-diff':
      patchHunt({ deployStage: 2, inventoryScanned: true });
      emit('info', 'hunt', 'Endpoint discovered: PATCH /v3/users/{id} (new)');
      emit('info', 'hunt', 'Endpoint changed: POST /v3/refunds');
      emit('warn', 'hunt', 'Zombie: GET /v1/bookings/export · no traffic for 211 days · no auth');
      emit('warn', 'hunt', 'Shadow: POST /internal/refund-override · used, never documented');
      break;
    case 'plan': {
      const ap: Approval = { id: ++approvalId, test: 'Mass-assignment escalation', endpoint: 'PATCH /v3/users/{id}', risk: 'Writes a user role (auto-reverted)', status: 'pending' };
      patchHunt({ deployStage: 3, plannerEndpoint: 'e9', approvals: [ap, ...useSim.getState().hunt.approvals] });
      emit('info', 'hunt', 'Attack planned: 3 targeted tests on PATCH /v3/users/{id} (skipped 3 irrelevant classes).');
      emit('warn', 'hunt', 'Risky test queued for human approval: mass-assignment escalation.');
      break;
    }
    case 'execute': {
      const h = useSim.getState().hunt;
      const pend = h.approvals.find((x) => x.status === 'pending');
      if (pend) useSim.getState().decideApproval(pend.id, true);
      patchHunt({ deployStage: 4 });
      useSim.getState().startExecutors();
      await appendAudit({ ts: nowClock(), agent: 'jwt', method: 'PATCH', path: '/v3/users/u-3', status: 403, note: 'tampered role claim rejected' });
      await appendAudit({ ts: nowClock(), agent: 'idor', method: 'PATCH', path: '/v3/users/u-4', status: 403, note: 'cross-agency edit rejected' });
      later(() => useSim.getState().spikeLatency(), 900);
      break;
    }
    case 'prove-attack':
      await proveAttack();
      break;
    case 'revert':
      await proveRevert();
      break;
    case 'ticket':
      patchHunt({ deployStage: 7, deployFindingAt: Date.now(), executing: false });
      useSim.setState((st) => ({ findings: st.findings.map((f) => (f.id === 'F-12' ? { ...f, status: 'open', txBlock: st.blocks[st.blocks.length - 1]?.number } : f)) }));
      emit('ok', 'hunt', 'Ticket raised: F-12 critical · owner Identity team · evidence + chain tx attached.');
      break;
  }
}

async function proveAttack() {
  const s = useSim.getState();
  const beforeRoot = rootOf(s.levels);
  patchHunt({ proof: { phase: 'before', beforeRoot } });
  execLog('verifier: snapshot root before = ' + beforeRoot.slice(0, 8) + '…');
  await wait(900);
  if (useSim.getState().gen !== s.gen) return;
  await appendAudit({ ts: nowClock(), agent: 'massassign', method: 'PATCH', path: '/v3/users/u-3', status: 200, note: '{"role":"admin"} as sub_agent (approved)' });
  const st = useSim.getState();
  const row = rowById(st.rows, 'u-3');
  const next = { ...row, role: 'admin' } as Row;
  // The agent's own test write is journaled (actor: ledgerhound-agent) so the watchdog doesn't alarm.
  useSim.setState((x) => ({
    rows: x.rows.map((r) => (r.id === 'u-3' ? next : r)),
    journal: [...x.journal, { id: ++journalId, rowId: 'u-3', before: row, after: next, actor: 'ledgerhound-agent (test)', txId: 'test-' + journalId, time: Date.now(), anchored: false }],
  }));
  const levels = await buildTreeFromRows(useSim.getState().rows);
  const afterRoot = rootOf(levels);
  useSim.setState({ levels });
  patchHunt({ deployStage: Math.max(useSim.getState().hunt.deployStage, 5), proof: { phase: 'attacked', beforeRoot, afterRoot, diff: 'users.u-3.role: sub_agent → admin' } });
  execLog('massassign: PATCH /v3/users/u-3 {"role":"admin"} → 200 OK', 'warn');
  execLog('verifier: root after = ' + afterRoot.slice(0, 8) + '… ≠ before → row diff users.u-3.role', 'alert');
  emit('alert', 'prove', 'State-change proof: root changed · users.u-3.role sub_agent → admin. Exploit confirmed.');
  await recompute();
}

async function proveRevert() {
  const s = useSim.getState();
  const row = rowById(s.rows, 'u-3');
  const orig = rowById(s.vault, 'u-3');
  if (sameRow(row, orig)) return;
  useSim.setState((x) => ({
    rows: x.rows.map((r) => (r.id === 'u-3' ? orig : r)),
    journal: [...x.journal, { id: ++journalId, rowId: 'u-3', before: row, after: orig, actor: 'ledgerhound-agent (revert)', txId: 'revert-' + journalId, time: Date.now(), anchored: false }],
  }));
  const levels = await buildTreeFromRows(useSim.getState().rows);
  const revertedRoot = rootOf(levels);
  useSim.setState((x) => ({ levels, hunt: { ...x.hunt, deployStage: Math.max(x.hunt.deployStage, 6), proof: { ...x.hunt.proof, phase: 'reverted', revertedRoot } } }));
  execLog('auto-revert: users.u-3.role restored → root = before ✓', 'ok');
  emit('ok', 'prove', 'Auto-revert: test change undone · root back to before-value ✓');
  await recompute();
}

// ------------------------------------------------------------------ initial state

const initialHunt = (): Hunt => ({
  version: 'v2.13.4',
  deployStage: 0,
  inventoryScanned: false,
  plannerEndpoint: 'e9',
  execLog: [],
  executing: false,
  rps: 0,
  rpsLimit: 4,
  latency: 120,
  backoff: false,
  killed: false,
  approvals: [
    { id: ++approvalId, test: 'Refund replay', endpoint: 'POST /v3/refunds', risk: 'Creates a duplicate refund on a test booking', status: 'pending' },
  ],
  proof: { phase: 'idle' },
  retesting: null,
});

const readURL = (): { mode: Mode; section: string } => {
  const p = new URLSearchParams(window.location.search);
  return { mode: p.get('mode') === 'tech' ? 'tech' : 'overview', section: p.get('section') ?? 't1' };
};

export const useSim = create<SimState>()((set, get) => ({
  ready: false,
  gen: 0,
  ...readURL(),
  theme: 'light',
  feedOpen: true,

  rows: SEED_ROWS,
  originalRows: SEED_ROWS,
  vault: SEED_ROWS,
  levels: [],
  anchoredLevels: [],
  anchoredRoot: '',
  anchoredAuditHead: ZERO_HASH,
  anchoredAuditIndex: -1,
  anchoredBlock: 0,
  epoch: 0,
  blocksSinceAnchor: 0,
  pendingAnchor: [],
  journal: [],
  watch: 'intact',
  incident: null,
  incidents: [],
  blocks: [],
  pendingTxs: [],
  forceAnchor: false,
  lastVerify: null,

  audit: [],
  auditEdited: null,
  auditVerify: null,

  findings: SEED_FINDINGS,
  events: [],
  settings: { autoRepair: true, repairDelayMs: CONFIG.repairDelayMs, epochBlocks: CONFIG.epochBlocks, chainPaused: false },
  hunt: initialHunt(),
  scenario: null,
  flowEdges: [],
  attackerMode: true,

  init: async () => {
    clearAllTimers();
    const token = ++initToken;
    const c = new MockChain(SEED);
    recomputeSeq++;
    eventId = 0;
    incidentId = 0;
    journalId = 0;
    const gen = get().gen;
    const rows = SEED_ROWS.map((r) => ({ ...r }));
    const levels = await buildTreeFromRows(rows);
    // audit log
    let prev = ZERO_HASH;
    const audit: AuditRecord[] = [];
    for (let i = 0; i < SEED_AUDIT.length; i++) {
      const entry: AuditEntry = { seq: i + 1, ...SEED_AUDIT[i] };
      const hash = await chainEntryHash(prev, entry);
      audit.push({ entry, prevHash: prev, hash });
      prev = hash;
    }
    // pre-mine history: genesis anchor + filler blocks
    const now = Date.now();
    const pre = 9;
    let anchoredBlock = 0;
    for (let i = 0; i < pre; i++) {
      const p: PendingTx[] = i === 2 ? [{ kind: 'anchor', method: 'anchor', args: { epoch: 1, merkleRoot: rootOf(levels), auditHead: prev } }] : [];
      const b = await c.mine(p, now - (pre - i) * CONFIG.blockMs);
      if (i === 2) anchoredBlock = b.number;
    }
    if (gen !== get().gen || token !== initToken) return;
    chain = c;
    set({
      ready: true,
      rows,
      originalRows: SEED_ROWS,
      vault: rows.map((r) => ({ ...r })),
      levels,
      anchoredLevels: levels,
      anchoredRoot: rootOf(levels),
      anchoredAuditHead: prev,
      anchoredAuditIndex: audit.length - 1,
      anchoredBlock,
      epoch: 1,
      blocksSinceAnchor: pre - 3,
      pendingAnchor: [],
      journal: [],
      watch: 'intact',
      incident: null,
      incidents: [],
      blocks: [...chain.blocks],
      pendingTxs: [],
      forceAnchor: false,
      lastVerify: null,
      audit,
      auditEdited: null,
      auditVerify: null,
      findings: SEED_FINDINGS.map((f) => ({ ...f })),
      events: [
        { id: ++eventId, t: now - 2000, level: 'chain', pillar: 'prove', text: `Block #${anchoredBlock.toLocaleString('en-US')}: anchor(epoch 1, root ${rootOf(levels).slice(0, 4)}…) — 16 rows sealed.` },
        { id: ++eventId, t: now - 1000, level: 'ok', pillar: 'protect', text: 'Watchdog online (read-only replica) · root matches anchor.' },
      ],
      hunt: initialHunt(),
      scenario: null,
      flowEdges: [],
    });
    startChain();
  },

  reset: async () => {
    set((s) => ({ gen: s.gen + 1, ready: false, settings: { ...s.settings, chainPaused: false } }));
    await get().init();
    emit('info', 'system', 'Reset to seeded state.');
  },

  setMode: (mode) => set({ mode }),
  setSection: (section) => set({ section }),
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setFeedOpen: (feedOpen) => set({ feedOpen }),

  editCell: (rowId, field, value) => {
    const s = get();
    const row = rowById(s.rows, rowId) as unknown as Record<string, string | number>;
    const cur = row[field];
    const v = typeof cur === 'number' ? Number(value) : String(value);
    if (typeof cur === 'number' && Number.isNaN(v)) return;
    if (cur === v) return;
    const next = { ...row, [field]: v } as unknown as Row;
    set({ rows: s.rows.map((r) => (r.id === rowId ? next : r)) });
    emit('warn', 'protect', `Direct DB write: ${rowId}.${field} ${cur} → ${v}`);
    void recompute(Date.now());
  },

  legitWrite: () => {
    const s = get();
    const bookings = s.rows.filter((r) => r.table === 'bookings') as Extract<Row, { table: 'bookings' }>[];
    let target = bookings.find((b) => b.status === 'held');
    let next: Row;
    if (target) next = { ...target, status: 'confirmed' };
    else {
      target = bookings.find((b) => b.status === 'confirmed') ?? bookings[0];
      next = target.status === 'confirmed' ? { ...target, status: 'ticketed' } : { ...target, fare: target.fare + 150 };
    }
    const before = target;
    const entry: JournalEntry = { id: ++journalId, rowId: before.id, before, after: next, actor: 'app-service', txId: 'pg-tx-' + (48210 + journalId), time: Date.now(), anchored: false };
    set({ rows: s.rows.map((r) => (r.id === before.id ? next : r)), journal: [...s.journal, entry] });
    emit('info', 'protect', `App write via journal: ${fieldChanges(before, next).map((c) => `${c.rowId}.${c.field} ${c.before} → ${c.after}`).join(', ')} (actor app-service)`);
    void recompute(Date.now());
  },

  repairNow: () => {
    if (repairTimer) {
      window.clearTimeout(repairTimer);
      repairTimer = null;
    }
    void doRepair();
  },

  verifyRoot: async () => {
    const t0 = performance.now();
    const levels = await buildTreeFromRows(get().rows);
    const ms = performance.now() - t0;
    const root = rootOf(levels);
    set({ lastVerify: { ms, root, match: root === get().anchoredRoot, at: Date.now() } });
    emit(root === get().anchoredRoot ? 'ok' : 'warn', 'prove', `Verify root: recomputed 16 leaves + 15 nodes in ${ms.toFixed(1)} ms · ${root === get().anchoredRoot ? 'matches' : 'differs from'} on-chain root.`);
  },

  runScenario: (id) => {
    const sc = SCENARIOS[id];
    scenarioTimers.forEach((t) => {
      window.clearTimeout(t);
      timers.delete(t);
    });
    scenarioTimers = [];
    const runId = ++scenarioRun;
    set({ scenario: { id, runId, startedAt: Date.now(), stepIdx: -1, done: false }, flowEdges: [] });
    sc.steps.forEach((step, i) => {
      const t = later(() => {
        const cur = get().scenario;
        if (!cur || cur.runId !== runId) return;
        set({ scenario: { ...cur, stepIdx: i }, flowEdges: step.flow ?? get().flowEdges });
        if (step.action) void applyAction(step.action);
      }, step.at);
      scenarioTimers.push(t);
    });
    const end = later(() => {
      const cur = get().scenario;
      if (!cur || cur.runId !== runId) return;
      set({ flowEdges: [] });
      if ((sc.kind === 'deploy' || sc.kind === 'hunt') && !cur.done) set({ scenario: { ...cur, done: true } });
    }, sc.duration);
    scenarioTimers.push(end);
  },

  stopScenario: () => {
    scenarioTimers.forEach((t) => window.clearTimeout(t));
    scenarioTimers = [];
    set({ scenario: null, flowEdges: [] });
  },

  setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
  setAttackerMode: (attackerMode) => set({ attackerMode }),

  coverUp: (index) => {
    const s = get();
    if (s.auditEdited !== null) return;
    const audit = s.audit.map((r, i) => (i === index ? { ...r, entry: { ...r.entry, path: '/v3/search/flights?from=DEL', note: 'routine search (edited)', status: 200 } } : r));
    set({ audit, auditEdited: index, auditVerify: null });
    emit('alert', 'prove', `Audit entry #${index + 1} rewritten to hide a request (simulated cover-up).`);
  },

  restoreAudit: () => {
    const s = get();
    if (s.auditEdited === null) return;
    set({ audit: s.audit.map((r, i) => (i === s.auditEdited ? { ...r, entry: { ...originalAuditEntry(i, r.entry) } } : r)), auditEdited: null, auditVerify: null });
  },

  verifyAudit: async () => {
    const s = get();
    const results: ('ok' | 'broken')[] = [];
    let prev = ZERO_HASH;
    let broken = false;
    let recomputedAnchored = '';
    for (let i = 0; i < s.audit.length; i++) {
      const h = await chainEntryHash(prev, s.audit[i].entry);
      if (h !== s.audit[i].hash) broken = true;
      results.push(broken ? 'broken' : 'ok');
      if (i === s.anchoredAuditIndex) recomputedAnchored = h;
      prev = h;
    }
    const headOk = recomputedAnchored === s.anchoredAuditHead || s.anchoredAuditIndex < 0;
    set({ auditVerify: { results, headOk, recomputedAnchored, ranAt: Date.now() } });
    emit(broken ? 'alert' : 'ok', 'prove', broken ? `Audit chain broken from entry #${results.indexOf('broken') + 1} · ≠ anchored auditHead.` : `Audit chain verified · ${s.audit.length} entries · matches anchored auditHead ✓`);
  },

  retest: (findingId) => {
    set((s) => ({ findings: s.findings.map((f) => (f.id === findingId ? { ...f, status: 'fixed' } : f)), hunt: { ...s.hunt, retesting: findingId } }));
    emit('info', 'hunt', `${findingId} marked fixed → retest scheduled (fix deploy detected).`);
    later(async () => {
      const f = get().findings.find((x) => x.id === findingId);
      await appendAudit({ ts: nowClock(), agent: 'retest', method: f?.endpoint.split(' ')[0] ?? 'GET', path: (f?.endpoint.split(' ')[1] ?? '/').replace('{id}', 'u-3'), status: 403, note: `retest ${findingId}: exploit blocked` });
      const root = rootOf(get().levels);
      set((s) => ({ findings: s.findings.map((x) => (x.id === findingId ? { ...x, status: 'closed' } : x)), hunt: { ...s.hunt, retesting: null } }));
      emit('ok', 'hunt', `Retest ${findingId}: 403 Forbidden · root unchanged (${root.slice(0, 4)}…) → closed ✓`);
    }, 1800);
  },

  replayProof: () => {
    void (async () => {
      await proveAttack();
      later(() => void proveRevert(), 2600);
    })();
  },

  setPlannerEndpoint: (id) => set((s) => ({ hunt: { ...s.hunt, plannerEndpoint: id } })),

  decideApproval: (id, ok) => {
    const ap = get().hunt.approvals.find((a) => a.id === id);
    set((s) => ({ hunt: { ...s.hunt, approvals: s.hunt.approvals.map((a) => (a.id === id ? { ...a, status: ok ? 'approved' : 'denied' } : a)) } }));
    if (ap) {
      emit(ok ? 'ok' : 'warn', 'hunt', `Human reviewer ${ok ? 'approved' : 'denied'}: ${ap.test} on ${ap.endpoint}`);
      execLog(`${ok ? 'approved' : 'denied'} by reviewer: ${ap.test}`, ok ? 'ok' : 'warn');
    }
  },

  setKill: (killed) => {
    patchHunt({ killed, executing: killed ? false : get().hunt.executing, rps: killed ? 0 : get().hunt.rps });
    emit(killed ? 'alert' : 'info', 'hunt', killed ? 'KILL SWITCH: all agents paused by orchestrator.' : 'Kill switch released · agents may resume.');
    execLog(killed ? '■ kill switch engaged — all executors halted' : '▶ kill switch released', killed ? 'alert' : 'info');
  },

  spikeLatency: () => {
    patchHunt({ latency: 1450, backoff: true });
    execLog('health: p95 latency 1450 ms > 800 ms budget → backing off to 1 req/s', 'warn');
    emit('warn', 'hunt', 'App health strain: p95 1450 ms → executors backed off to 1 req/s.');
    later(() => {
      patchHunt({ latency: 180, backoff: false });
      execLog('health: p95 180 ms → resuming 4 req/s', 'ok');
    }, 3500);
  },

  startExecutors: () => {
    if (get().hunt.killed) {
      execLog('blocked: kill switch engaged', 'alert');
      return;
    }
    patchHunt({ executing: true });
    const lines = [
      'scope: tripgrid-staging.test ✓ in allowlist',
      'vault: issued test token sub_agent@skyline (expires 15m)',
      'jwt: PATCH /v3/users/u-3 with tampered role claim → 403',
      'idor: PATCH /v3/users/u-4 (BlueOrbit) as Skyline → 403',
      'massassign: awaiting approval … approved',
    ];
    lines.forEach((l, i) => later(() => execLog(l, i === 4 ? 'ok' : 'info'), i * 420));
  },
}));

// restore helper for audit cover-up
function originalAuditEntry(i: number, cur: AuditEntry): AuditEntry {
  const orig = ORIGINAL_AUDIT.get(i);
  return orig ?? cur;
}
const ORIGINAL_AUDIT = new Map<number, AuditEntry>();
useSim.subscribe((s, prev) => {
  if (s.audit !== prev.audit && s.auditEdited === null) {
    ORIGINAL_AUDIT.clear();
    s.audit.forEach((r, i) => ORIGINAL_AUDIT.set(i, r.entry));
  }
});

// ------------------------------------------------------------------ rate gauge ticker
window.setInterval(() => {
  const s = useSim.getState();
  const h = s.hunt;
  const target = h.killed || !h.executing ? 0 : h.backoff ? 1 : h.rpsLimit;
  const rps = Math.round((h.rps + (target - h.rps) * 0.5 + (target ? (Math.random() - 0.5) * 0.4 : 0)) * 10) / 10;
  if (rps !== h.rps) useSim.setState({ hunt: { ...h, rps: Math.max(0, rps) } });
}, 500);

// ------------------------------------------------------------------ selectors

export const latestBlock = (s: SimState) => s.blocks[s.blocks.length - 1];
export const currentRoot = (s: SimState) => (s.levels.length ? rootOf(s.levels) : '');

// Scenarios are DATA: timed steps, store actions and two captions (plain / technical).
// Timings for the watchdog and animations live here too, not in components.

export const CONFIG = {
  blockMs: 4000,
  repairDelayMs: 1200,
  verifyMs: 380,
  epochBlocks: 3,
  /** delay between pipeline lights in the Tamper Lab */
  pipelineStepMs: 170,
  /** how long the "Repaired & sealed" blue state stays before returning to green */
  sealedHoldMs: 6000,
};

export type ScenarioId = 'fare-to-one' | 'make-me-admin' | 'double-refund' | 'peek-other-agency' | 'legit-booking' | 'deploy';

export type ScenarioAction =
  | { type: 'tamper'; rowId: string; patch: Record<string, string | number> }
  | { type: 'legit' }
  | { type: 'idor-request' }
  | { type: 'idor-verify' }
  | { type: 'idor-file' }
  | { type: 'deploy-detect' }
  | { type: 'inventory-diff' }
  | { type: 'plan' }
  | { type: 'execute' }
  | { type: 'prove-attack' }
  | { type: 'revert' }
  | { type: 'ticket' };

export interface ScenarioStep {
  at: number;
  action?: ScenarioAction;
  lane?: 1 | 2 | 3;
  plain: string;
  technical: string;
  /** architecture edges to animate while this step is current */
  flow?: string[];
}

export interface Scenario {
  id: ScenarioId;
  label: string;
  sub: string;
  kind: 'tamper' | 'legit' | 'hunt' | 'deploy';
  findingId?: string;
  rowId?: string;
  techSection: string;
  duration: number;
  steps: ScenarioStep[];
}

const PROTECT_FLOW = ['watchdog-vault', 'watchdog-anchor', 'anchor-chain'];

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'fare-to-one': {
    id: 'fare-to-one',
    label: 'Change a ₹18,400 fare to ₹1',
    sub: 'Edit a booking straight in the database',
    kind: 'tamper',
    findingId: 'F-09',
    rowId: 'b-1003',
    techSection: 't5',
    duration: 9000,
    steps: [
      { at: 0, lane: 1, plain: 'An insider opens booking b-1003 — Delhi to Singapore, ₹18,400.', technical: 'Direct SQL session on bookings (bypasses the app and its journal).' },
      { at: 1100, lane: 1, action: { type: 'tamper', rowId: 'b-1003', patch: { fare: 1 } }, plain: 'They change the fare to ₹1. No app, no trace — or so they think.', technical: 'UPDATE bookings SET fare = 1 WHERE id = \'b-1003\';', flow: PROTECT_FLOW },
    ],
  },
  'make-me-admin': {
    id: 'make-me-admin',
    label: 'Make myself admin',
    sub: 'Promote a sub-agent account',
    kind: 'tamper',
    findingId: 'F-12',
    rowId: 'u-3',
    techSection: 't5',
    duration: 9000,
    steps: [
      { at: 0, lane: 1, plain: 'Kabir is a sub-agent at Skyline Travels. He wants the keys to everything.', technical: 'users.u-3 { role: "sub_agent" } — target of privilege escalation.' },
      { at: 1100, lane: 1, action: { type: 'tamper', rowId: 'u-3', patch: { role: 'admin' } }, plain: 'His role flips from sub-agent to admin.', technical: 'UPDATE users SET role = \'admin\' WHERE id = \'u-3\';', flow: PROTECT_FLOW },
    ],
  },
  'double-refund': {
    id: 'double-refund',
    label: 'Get refunded twice',
    sub: 'Duplicate a refund payout',
    kind: 'tamper',
    findingId: 'F-07',
    rowId: 'r-502',
    techSection: 't5',
    duration: 9000,
    steps: [
      { at: 0, lane: 1, plain: 'Refund r-502 for ₹6,200 was paid out once, as it should be.', technical: 'refunds.r-502 { amount: 6200, payouts: 1, status: "paid" }' },
      { at: 1100, lane: 1, action: { type: 'tamper', rowId: 'r-502', patch: { payouts: 2, status: 'paid_twice' } }, plain: 'Someone marks it as paid twice. ₹6,200 more leaves the wallet.', technical: 'UPDATE refunds SET payouts = 2, status = \'paid_twice\' WHERE id = \'r-502\';', flow: PROTECT_FLOW },
    ],
  },
  'peek-other-agency': {
    id: 'peek-other-agency',
    label: "Read another agency's bookings",
    sub: 'Swap one booking ID in a request',
    kind: 'hunt',
    findingId: 'F-04',
    techSection: 't7',
    duration: 10500,
    steps: [
      { at: 0, lane: 1, plain: 'A Skyline agent opens their own booking, b-1001.', technical: 'GET /v3/bookings/b-1001  (Skyline sub_agent token) → 200', flow: ['planner-exec'] },
      { at: 1500, lane: 1, action: { type: 'idor-request' }, plain: 'They change one number in the address: b-1001 becomes b-1005 — a BlueOrbit booking.', technical: 'GET /v3/bookings/b-1005  (same token) → 200 OK', flow: ['exec-safety', 'safety-app'] },
      { at: 3600, lane: 2, action: { type: 'idor-verify' }, plain: 'Our Hunt agent tries the same trick with test accounts and gets someone else’s booking back.', technical: 'Verifier: agency_id(token)=Skyline ≠ agency_id(resource)=BlueOrbit. 1 record, fields redacted.', flow: ['exec-verifier', 'verifier-ledger'] },
      { at: 6000, lane: 2, action: { type: 'idor-file' }, plain: 'Proven with one masked record — no data hoarding. Ticket goes to the Booking team.', technical: 'F-04 updated · duplicate merged · owner: Booking team.', flow: ['verifier-triage', 'triage-reporter'] },
      { at: 7200, lane: 3, plain: 'The evidence and the agent’s request log are sealed in the next block.', technical: 'IntegrityAnchor.anchor(epoch, root, auditHead) — auditHead covers the IDOR request.', flow: ['anchor-chain'] },
    ],
  },
  'legit-booking': {
    id: 'legit-booking',
    label: 'A real customer books a trip',
    sub: 'Or: do something normal',
    kind: 'legit',
    techSection: 't5',
    duration: 9000,
    steps: [
      { at: 0, lane: 1, plain: 'A customer pays for their held booking through the TripGrid app.', technical: 'POST /v3/bookings/{id}/confirm via app-service (DB role: app_rw).' },
      { at: 1100, lane: 1, action: { type: 'legit' }, plain: 'The booking moves forward. The data changes — legitimately.', technical: 'CDC (logical decoding) writes a journal entry {before, after, actor: app-service, txId}.', flow: ['watchdog-anchor'] },
    ],
  },
  deploy: {
    id: 'deploy',
    label: 'Ship a new release',
    sub: 'tripgrid-api v2.14.0',
    kind: 'deploy',
    findingId: 'F-12',
    techSection: 't2',
    duration: 16000,
    steps: [
      { at: 0, action: { type: 'deploy-detect' }, plain: 'A new release lands. We notice within seconds.', technical: 'CI/CD webhook: tripgrid-api v2.14.0 · new JS bundle main.8f2c.js', flow: ['triggers-orch'] },
      { at: 1800, action: { type: 'inventory-diff' }, plain: 'We map what changed — without any documentation.', technical: 'Recon diff: +1 new (PATCH /v3/users/{id}), 1 changed (POST /v3/refunds), 1 zombie, 1 shadow.', flow: ['orch-recon', 'recon-kg', 'logs-inventory', 'kg-inventory'] },
      { at: 4200, action: { type: 'plan' }, plain: 'The planner picks just 3 tests that matter, instead of thousands.', technical: 'Planner over knowledge graph → mass-assignment, IDOR, JWT role tamper on the new endpoint.', flow: ['inventory-planner', 'kg-planner'] },
      { at: 6400, action: { type: 'execute' }, plain: 'Agents run them gently, watching the app’s health.', technical: 'Executors · 4 req/s limit · health backoff armed · human approved the risky test.', flow: ['planner-exec', 'exec-safety', 'safety-app', 'human-orch'] },
      { at: 9000, action: { type: 'prove-attack' }, plain: 'One test works. We prove it by the data change, not the response code.', technical: 'Root before ≠ root after. Row diff: users.u-3.role sub_agent → admin.', flow: ['exec-verifier', 'verifier-ledger'] },
      { at: 11600, action: { type: 'revert' }, plain: 'We undo our own test change automatically.', technical: 'Auto-revert from vault snapshot → root equals the before-root.', flow: ['verifier-ledger'] },
      { at: 13200, action: { type: 'ticket' }, plain: 'A ready-to-fix ticket reaches the Identity team.', technical: 'F-12 · critical · owner Identity team · evidence + chain tx attached.', flow: ['verifier-triage', 'triage-reporter', 'reporter-retest'] },
    ],
  },
};

export const CHEAT_ORDER: ScenarioId[] = ['fare-to-one', 'make-me-admin', 'double-refund', 'peek-other-agency', 'legit-booking'];

/** Captions for the live watchdog pipeline. Keyed by incident stage. */
export const STAGE_CAPTIONS = {
  detecting: { plain: 'Something changed. Checking…', technical: 'recompute(): rebuild tree, compare root with latest anchored root.' },
  tamper: { plain: 'Alarm! This change didn’t come through the app.', technical: 'Root mismatch, no journal entry explains before → after. Walking mismatched branches.' },
  repairing: { plain: 'Found the exact row. Putting it back…', technical: 'Merkle proof pinpoints the leaf; restoring the row from the WORM vault.' },
  repaired: { plain: 'Fixed. The data matches the sealed fingerprint again.', technical: 'Root re-verified against the anchored root ✓. repairReceipt queued for next block.' },
  sealed: { plain: 'A repair receipt is sealed on the blockchain.', technical: 'IntegrityAnchor.repairReceipt(epoch, rowIds, restoredRoot) mined.' },
  legit: { plain: 'Changed — and the app’s own journal explains it. No alarm.', technical: 'Journal entry matches before → after. Row marked pending anchor.' },
  anchored: { plain: 'The new state is sealed at the next checkpoint.', technical: 'IntegrityAnchor.anchor(epoch, newRoot, auditHead) mined.' },
  waiting: { plain: 'Waiting for someone to try something…', technical: 'Watchdog idle · root matches anchor.' },
  manual: { plain: 'Caught. Waiting for the presenter to press “Repair now”.', technical: 'Auto-repair off — tamper isolated, repair pending manual approval.' },
} as const;

export type StageKey = keyof typeof STAGE_CAPTIONS;

// Deterministic seeded world for "TripGrid", a fictional B2B travel platform.
// Everything here is fictional. A fixed PRNG seed drives the few random-looking values.

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED = 0x1ed6e4;

export type Agency = 'Skyline Travels' | 'BlueOrbit Tours' | 'TripGrid';
export type Role = 'admin' | 'agency_owner' | 'sub_agent' | 'finance';

export interface BookingRow {
  table: 'bookings';
  id: string;
  agency: Agency;
  traveller: string;
  route: string;
  fare: number;
  status: string;
}
export interface RefundRow {
  table: 'refunds';
  id: string;
  booking_id: string;
  amount: number;
  payouts: number;
  status: string;
}
export interface UserRow {
  table: 'users';
  id: string;
  agency: Agency;
  name: string;
  role: Role;
}
export type Row = BookingRow | RefundRow | UserRow;

export const SEED_ROWS: Row[] = [
  { table: 'bookings', id: 'b-1001', agency: 'Skyline Travels', traveller: 'Ishita Rao', route: 'BLR → DEL', fare: 6840, status: 'ticketed' },
  { table: 'bookings', id: 'b-1002', agency: 'Skyline Travels', traveller: 'Rohan Kapoor', route: 'BOM → DXB', fare: 21350, status: 'ticketed' },
  { table: 'bookings', id: 'b-1003', agency: 'Skyline Travels', traveller: 'Meera Pillai', route: 'DEL → SIN', fare: 18400, status: 'confirmed' },
  { table: 'bookings', id: 'b-1004', agency: 'BlueOrbit Tours', traveller: 'Arjun Bhatt', route: 'MAA → CCU', fare: 5920, status: 'ticketed' },
  { table: 'bookings', id: 'b-1005', agency: 'BlueOrbit Tours', traveller: 'Sana Qureshi', route: 'HYD → LHR', fare: 37650, status: 'confirmed' },
  { table: 'bookings', id: 'b-1006', agency: 'BlueOrbit Tours', traveller: 'Vikram Desai', route: 'GOI → BOM', fare: 4210, status: 'held' },
  { table: 'bookings', id: 'b-1007', agency: 'Skyline Travels', traveller: 'Nisha Menon', route: 'COK → DOH', fare: 14780, status: 'cancelled' },
  { table: 'bookings', id: 'b-1008', agency: 'BlueOrbit Tours', traveller: 'Kunal Joshi', route: 'PNQ → BKK', fare: 16990, status: 'held' },
  { table: 'refunds', id: 'r-501', booking_id: 'b-1007', amount: 13300, payouts: 1, status: 'paid' },
  { table: 'refunds', id: 'r-502', booking_id: 'b-1002', amount: 6200, payouts: 1, status: 'paid' },
  { table: 'refunds', id: 'r-503', booking_id: 'b-1004', amount: 1850, payouts: 0, status: 'requested' },
  { table: 'refunds', id: 'r-504', booking_id: 'b-1005', amount: 9400, payouts: 0, status: 'approved' },
  { table: 'users', id: 'u-1', agency: 'TripGrid', name: 'Devika Iyer', role: 'admin' },
  { table: 'users', id: 'u-2', agency: 'Skyline Travels', name: 'Farhan Ali', role: 'agency_owner' },
  { table: 'users', id: 'u-3', agency: 'Skyline Travels', name: 'Kabir Sethi', role: 'sub_agent' },
  { table: 'users', id: 'u-4', agency: 'BlueOrbit Tours', name: 'Tanvi Shah', role: 'finance' },
];

export const ROW_IDS = SEED_ROWS.map((r) => r.id);

/** Editable fields per table (id/table/foreign keys stay fixed). */
export const EDITABLE: Record<Row['table'], string[]> = {
  bookings: ['traveller', 'route', 'fare', 'status'],
  refunds: ['amount', 'payouts', 'status'],
  users: ['name', 'role'],
};

export const TABLE_COLUMNS: Record<Row['table'], string[]> = {
  bookings: ['agency', 'traveller', 'route', 'fare', 'status'],
  refunds: ['booking_id', 'amount', 'payouts', 'status'],
  users: ['agency', 'name', 'role'],
};

// ---------------------------------------------------------------- API inventory

export type EndpointState = 'active' | 'zombie' | 'shadow';
export interface Endpoint {
  id: string;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  path: string;
  state: EndpointState;
  lastSeen: string;
  auth: 'none' | 'jwt' | 'jwt+role';
  data: string;
  owner: string;
  recommendation: 'keep' | 'decommission' | 'restrict' | 'update' | 'document';
  /** introduced/changed by v2.14.0 */
  diff?: 'new' | 'changed';
  /** only discovered after the deploy recon run */
  discoveredByDeploy?: boolean;
  source: string;
}

export const ENDPOINTS: Endpoint[] = [
  { id: 'e1', method: 'GET', path: '/v3/search/flights', state: 'active', lastSeen: '2s ago', auth: 'jwt', data: 'Fares, schedules', owner: 'Search team', recommendation: 'keep', source: 'UI crawl · HAR' },
  { id: 'e2', method: 'POST', path: '/v3/holds', state: 'active', lastSeen: '6s ago', auth: 'jwt+role', data: 'Fare hold', owner: 'Booking team', recommendation: 'keep', source: 'UI crawl · HAR' },
  { id: 'e3', method: 'GET', path: '/v3/bookings/{id}', state: 'active', lastSeen: '1s ago', auth: 'jwt', data: 'Traveller PII, fare', owner: 'Booking team', recommendation: 'restrict', source: 'UI crawl · HAR' },
  { id: 'e4', method: 'POST', path: '/v3/bookings/{id}/confirm', state: 'active', lastSeen: '9s ago', auth: 'jwt+role', data: 'Fare, payment ref', owner: 'Booking team', recommendation: 'update', source: 'UI crawl · JS bundle' },
  { id: 'e5', method: 'POST', path: '/v3/payments', state: 'active', lastSeen: '4s ago', auth: 'jwt+role', data: 'Payment token', owner: 'Payments team', recommendation: 'keep', source: 'HAR' },
  { id: 'e6', method: 'POST', path: '/v3/bookings/{id}/cancel', state: 'active', lastSeen: '40s ago', auth: 'jwt+role', data: 'Booking status', owner: 'Booking team', recommendation: 'keep', source: 'UI crawl' },
  { id: 'e7', method: 'POST', path: '/v3/refunds', state: 'active', lastSeen: '12s ago', auth: 'jwt+role', data: 'Refund amount', owner: 'Payments team', recommendation: 'update', diff: 'changed', source: 'JS bundle · gateway logs' },
  { id: 'e8', method: 'GET', path: '/v3/refunds/{id}', state: 'active', lastSeen: '30s ago', auth: 'jwt', data: 'Refund status', owner: 'Payments team', recommendation: 'keep', source: 'HAR' },
  { id: 'e9', method: 'PATCH', path: '/v3/users/{id}', state: 'active', lastSeen: '18s ago', auth: 'jwt', data: 'User profile, role', owner: 'Identity team', recommendation: 'restrict', diff: 'new', discoveredByDeploy: true, source: 'JS bundle diff' },
  { id: 'e10', method: 'GET', path: '/v3/users/me', state: 'active', lastSeen: '1s ago', auth: 'jwt', data: 'Profile', owner: 'Identity team', recommendation: 'keep', source: 'UI crawl' },
  { id: 'e11', method: 'GET', path: '/v3/agencies/{id}/credit', state: 'active', lastSeen: '25s ago', auth: 'jwt+role', data: 'Credit limit', owner: 'Finance team', recommendation: 'keep', source: 'UI crawl (finance role)' },
  { id: 'e12', method: 'POST', path: '/v3/auth/token', state: 'active', lastSeen: '1s ago', auth: 'none', data: 'JWT', owner: 'Identity team', recommendation: 'keep', source: 'HAR' },
  { id: 'e13', method: 'GET', path: '/v3/invoices/{id}', state: 'active', lastSeen: '50s ago', auth: 'jwt', data: 'Invoice, GSTIN', owner: 'Finance team', recommendation: 'keep', source: 'UI crawl' },
  { id: 'e14', method: 'GET', path: '/v1/bookings', state: 'zombie', lastSeen: '143 days ago', auth: 'jwt', data: 'Booking list', owner: 'Booking team', recommendation: 'decommission', source: 'Version guess · gateway route config' },
  { id: 'e15', method: 'GET', path: '/v1/bookings/export', state: 'zombie', lastSeen: '211 days ago', auth: 'none', data: 'Passport numbers', owner: 'Platform team', recommendation: 'decommission', source: 'Old JS bundle' },
  { id: 'e16', method: 'POST', path: '/internal/refund-override', state: 'shadow', lastSeen: '3h ago', auth: 'jwt', data: 'Refund amount', owner: 'Payments team', recommendation: 'restrict', discoveredByDeploy: true, source: 'Gateway logs (no spec)' },
  { id: 'e17', method: 'GET', path: '/v2/fares/rules', state: 'zombie', lastSeen: '96 days ago', auth: 'jwt', data: 'Fare rules', owner: 'Search team', recommendation: 'decommission', source: 'Version guess' },
  { id: 'e18', method: 'POST', path: '/beta/supplier/callback', state: 'shadow', lastSeen: '11m ago', auth: 'none', data: 'Supplier PNR', owner: 'Supplier integrations', recommendation: 'document', source: 'Gateway logs (no spec)' },
];

export const OPENAPI_YAML = `openapi: 3.1.0
info:
  title: TripGrid API (inferred by LedgerHound)
  version: 2.14.0
  x-generated-from: [ui-crawl, har, js-bundles, gateway-logs-90d]
paths:
  /v3/users/{id}:
    patch:
      x-first-seen: deploy v2.14.0
      x-roles-observed: [admin, agency_owner, sub_agent]
      parameters:
        - { name: id, in: path, required: true, schema: { type: string } }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                name:  { type: string }
                phone: { type: string }
                role:  { type: string, x-ledgerhound: "accepted from body — mass assignment risk" }
      responses:
        '200': { description: Updated user }
  /v3/refunds:
    post:
      x-changed-in: v2.14.0
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [booking_id, refund_request_id]
              properties:
                booking_id:        { type: string }
                refund_request_id: { type: string, x-ledgerhound: "idempotency key — replay tested" }
                amount:            { type: integer }
  /v1/bookings/export:
    get:
      x-state: zombie
      x-last-traffic: 211 days ago
      security: []          # reachable without auth
      x-recommendation: decommission`;

// ---------------------------------------------------------------- Findings

export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type FindingStatus = 'open' | 'fixed' | 'closed';

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  owner: string;
  endpoint: string;
  cls: string;
  status: FindingStatus;
  businessContext: string;
  fix: string;
  request: string;
  response: string;
  diff?: string;
  duplicatesMerged: number;
  recommendation?: string;
  txBlock?: number;
}

export const SEED_FINDINGS: Finding[] = [
  {
    id: 'F-12',
    title: 'Sub-agent can set own role to admin via mass assignment',
    severity: 'critical',
    owner: 'Identity team',
    endpoint: 'PATCH /v3/users/{id}',
    cls: 'Mass assignment → privilege escalation',
    status: 'open',
    businessContext: 'Admin can edit every agency’s bookings, markups and credit limits.',
    fix: 'Allowlist writable fields (name, phone). Ignore `role` unless caller is admin; add server-side role check.',
    request: 'PATCH /v3/users/u-3\nAuthorization: Bearer <sub_agent test token>\n\n{"role":"admin"}',
    response: 'HTTP/1.1 200 OK\n{"id":"u-3","updated":true}',
    diff: 'users.u-3.role: sub_agent → admin',
    duplicatesMerged: 0,
  },
  {
    id: 'F-09',
    title: 'Fare field trusted from client on booking confirm',
    severity: 'critical',
    owner: 'Booking team',
    endpoint: 'POST /v3/bookings/{id}/confirm',
    cls: 'Business logic · fare tampering',
    status: 'open',
    businessContext: 'Direct revenue loss on every tampered ticket; supplier still charges full fare.',
    fix: 'Re-price server-side from the hold; reject any client-sent fare that differs from the held fare.',
    request: 'POST /v3/bookings/b-1003/confirm\n\n{"fare":1}',
    response: 'HTTP/1.1 200 OK\n{"status":"confirmed"}',
    diff: 'bookings.b-1003.fare: 18400 → 1',
    duplicatesMerged: 2,
  },
  {
    id: 'F-07',
    title: 'Refund replay: same refund_request_id accepted twice',
    severity: 'high',
    owner: 'Payments team',
    endpoint: 'POST /v3/refunds',
    cls: 'Business logic · replay',
    status: 'open',
    businessContext: 'Each replay pays the refund again from the agency wallet.',
    fix: 'Enforce idempotency: unique constraint on refund_request_id; return the original result on retry.',
    request: 'POST /v3/refunds  (sent twice)\n\n{"booking_id":"b-1002","refund_request_id":"rq-77"}',
    response: 'HTTP/1.1 201 Created   ×2',
    diff: 'refunds.r-502.payouts: 1 → 2',
    duplicatesMerged: 1,
  },
  {
    id: 'F-04',
    title: 'Cross-agency booking read via IDOR',
    severity: 'high',
    owner: 'Booking team',
    endpoint: 'GET /v3/bookings/{id}',
    cls: 'Access control · IDOR',
    status: 'open',
    businessContext: 'One agency can read another agency’s traveller names, routes and fares.',
    fix: 'Scope the query by the caller’s agency_id; return 404 for bookings outside it.',
    request: 'GET /v3/bookings/b-1005\nAuthorization: Bearer <Skyline sub_agent test token>',
    response: 'HTTP/1.1 200 OK\n{"id":"b-1005","agency":"BlueOrbit Tours","traveller":"S*** Q***", …}  (1 record, redacted)',
    duplicatesMerged: 0,
  },
  {
    id: 'F-02',
    title: 'Zombie export endpoint reachable without auth exposes passport numbers',
    severity: 'critical',
    owner: 'Platform team',
    endpoint: 'GET /v1/bookings/export',
    cls: 'Zombie API · data exposure',
    status: 'open',
    businessContext: 'Passport numbers are regulated PII; one request leaks them with no login.',
    fix: 'Decommission /v1 routes at the gateway; rotate any exposed export tokens.',
    request: 'GET /v1/bookings/export?limit=1\n(no Authorization header)',
    response: 'HTTP/1.1 200 OK\n[{"passport":"Z12•••••9"}]  (1 record, masked — no bulk extraction)',
    duplicatesMerged: 0,
    recommendation: 'decommission',
  },
];

// ---------------------------------------------------------------- Audit log seed

export interface AuditEntry {
  seq: number;
  ts: string;
  agent: string;
  method: string;
  path: string;
  status: number;
  note: string;
}

export const SEED_AUDIT: Omit<AuditEntry, 'seq'>[] = [
  { ts: '10:02:11', agent: 'recon', method: 'GET', path: '/v3/search/flights?from=BLR', status: 200, note: 'crawl as sub_agent' },
  { ts: '10:02:12', agent: 'recon', method: 'GET', path: '/v3/bookings/b-1001', status: 200, note: 'own booking (baseline)' },
  { ts: '10:02:14', agent: 'recon', method: 'GET', path: '/v1/bookings', status: 200, note: 'version guess → zombie' },
  { ts: '10:02:19', agent: 'idor', method: 'GET', path: '/v3/bookings/b-1005', status: 200, note: 'cross-agency read (1 record)' },
  { ts: '10:02:23', agent: 'fare', method: 'POST', path: '/v3/bookings/b-1003/confirm', status: 200, note: 'fare=1 on test booking' },
  { ts: '10:02:27', agent: 'replay', method: 'POST', path: '/v3/refunds', status: 201, note: 'replay rq-77 (approved)' },
];

// ---------------------------------------------------------------- Planner knowledge

export interface PlannedTest {
  name: string;
  reasoning: string;
  risky?: boolean;
}
export interface PlannerContext {
  endpointId: string;
  params: string[];
  roles: string[];
  flow: string;
  chosen: PlannedTest[];
  skipped: { name: string; why: string }[];
}

export const PLANNER: PlannerContext[] = [
  {
    endpointId: 'e9',
    params: ['id (path)', 'name', 'phone', 'role ← accepted in body'],
    roles: ['admin', 'agency_owner', 'sub_agent'],
    flow: 'account management (outside booking flow)',
    chosen: [
      { name: 'Mass-assignment escalation', reasoning: '`role` field accepted in body + sub_agent can call it → test mass-assignment escalation', risky: true },
      { name: 'IDOR on {id}', reasoning: 'Path id is a user id; sub_agent should only edit itself → try a user from BlueOrbit' },
      { name: 'JWT role-claim tamper', reasoning: 'Handler is new in v2.14.0; check it validates the role claim server-side' },
    ],
    skipped: [
      { name: 'SQL injection sweep', why: 'ORM-generated query, typed params, no string concatenation seen' },
      { name: 'Fare tampering', why: 'Endpoint carries no price fields' },
      { name: 'Rate-limit abuse', why: 'Not a business-critical cost path' },
    ],
  },
  {
    endpointId: 'e7',
    params: ['booking_id', 'refund_request_id', 'amount'],
    roles: ['agency_owner', 'finance'],
    flow: 'search → hold → book → pay → cancel → refund',
    chosen: [
      { name: 'Refund replay', reasoning: '`refund_request_id` looks like an idempotency key and handler changed in v2.14.0 → replay it', risky: true },
      { name: 'Amount override', reasoning: 'Client sends `amount`; refund should be derived from booking → send amount > fare' },
      { name: 'Cancel-rebook refund abuse', reasoning: 'Refund sits after cancel in the flow → cancel, rebook, refund old booking' },
    ],
    skipped: [
      { name: 'XSS payloads', why: 'JSON API, no HTML rendering of these fields' },
      { name: 'Mass assignment of role', why: 'No user fields on this resource' },
    ],
  },
  {
    endpointId: 'e3',
    params: ['id (path)'],
    roles: ['sub_agent', 'agency_owner', 'finance'],
    flow: 'book → view booking',
    chosen: [
      { name: 'Cross-agency IDOR', reasoning: 'Sequential ids `b-10xx` + two agencies with test accounts → read a BlueOrbit id as Skyline' },
      { name: 'Excessive data check', reasoning: 'Response includes traveller PII → check what a sub_agent can see' },
    ],
    skipped: [
      { name: 'Refund replay', why: 'Read-only endpoint' },
      { name: 'Mass assignment', why: 'GET has no body' },
    ],
  },
];


export const FILLER_METHODS = ['transfer', 'swap', 'approve', 'mint', 'deposit', 'claim'];


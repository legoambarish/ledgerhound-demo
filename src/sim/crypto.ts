// Real cryptography, computed in the browser with WebCrypto.
// leafHash(row)  = SHA256(0x00 ‖ canonicalJSON(row))
// nodeHash(L, R) = SHA256(0x01 ‖ L ‖ R)
// entryHash      = SHA256(prevHash ‖ canonicalJSON(entry))

const enc = new TextEncoder();

export async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return new Uint8Array(buf);
}

export function toHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

export function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Canonical JSON: sorted keys, no whitespace. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonicalJSON).join(',') + ']';
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJSON(obj[k])).join(',') + '}';
}

export async function sha256Hex(text: string): Promise<string> {
  return toHex(await sha256(enc.encode(text)));
}

export async function leafHash(row: unknown): Promise<string> {
  return toHex(await sha256(concat(new Uint8Array([0x00]), enc.encode(canonicalJSON(row)))));
}

export async function nodeHash(leftHex: string, rightHex: string): Promise<string> {
  return toHex(await sha256(concat(new Uint8Array([0x01]), fromHex(leftHex), fromHex(rightHex))));
}

/** levels[0] = leaves, levels[last] = [root]. Leaf count must be a power of two. */
export type Levels = string[][];

export async function buildTree(leaves: string[]): Promise<Levels> {
  const levels: Levels = [leaves.slice()];
  let cur = leaves;
  while (cur.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < cur.length; i += 2) next.push(await nodeHash(cur[i], cur[i + 1]));
    levels.push(next);
    cur = next;
  }
  return levels;
}

export async function buildTreeFromRows(rows: unknown[]): Promise<Levels> {
  const leaves = await Promise.all(rows.map((r) => leafHash(r)));
  return buildTree(leaves);
}

export const rootOf = (levels: Levels): string => levels[levels.length - 1][0];

export interface ProofStep {
  sibling: string;
  /** which side the sibling sits on */
  side: 'left' | 'right';
  level: number;
}

export function merkleProof(levels: Levels, leafIndex: number): ProofStep[] {
  const steps: ProofStep[] = [];
  let idx = leafIndex;
  for (let l = 0; l < levels.length - 1; l++) {
    const isRight = idx % 2 === 1;
    const sibIdx = isRight ? idx - 1 : idx + 1;
    steps.push({ sibling: levels[l][sibIdx], side: isRight ? 'left' : 'right', level: l });
    idx = Math.floor(idx / 2);
  }
  return steps;
}

export interface VerifiedProof {
  ok: boolean;
  computed: string[]; // running hash after each step, last = recomputed root
}

export async function verifyProof(leaf: string, proof: ProofStep[], root: string): Promise<VerifiedProof> {
  const computed: string[] = [];
  let h = leaf;
  for (const s of proof) {
    h = s.side === 'left' ? await nodeHash(s.sibling, h) : await nodeHash(h, s.sibling);
    computed.push(h);
  }
  return { ok: h === root, computed };
}

export interface WalkNode {
  level: number;
  index: number;
  mismatch: boolean;
}

/**
 * Walk down from the root, descending only into mismatched branches.
 * Returns every node inspected (in visiting order) and the changed leaf indices.
 */
export function diffWalk(a: Levels, b: Levels): { visited: WalkNode[]; changedLeaves: number[] } {
  const visited: WalkNode[] = [];
  const changedLeaves: number[] = [];
  const top = a.length - 1;
  let frontier: number[] = [0];
  for (let l = top; l >= 0; l--) {
    const next: number[] = [];
    for (const i of frontier) {
      const mismatch = a[l][i] !== b[l][i];
      visited.push({ level: l, index: i, mismatch });
      if (mismatch) {
        if (l === 0) changedLeaves.push(i);
        else next.push(i * 2, i * 2 + 1);
      }
    }
    frontier = next;
  }
  return { visited, changedLeaves };
}

export async function chainEntryHash(prevHex: string, entry: unknown): Promise<string> {
  return toHex(await sha256(concat(fromHex(prevHex), enc.encode(canonicalJSON(entry)))));
}

export const ZERO_HASH = '0'.repeat(64);

export const short = (h: string, n = 4): string => (h.length <= n * 2 + 1 ? h : `${h.slice(0, n)}…${h.slice(-n)}`);

// Mock EVM chain. Block hashes are real SHA-256 over (parentHash ‖ txHashes).
import { canonicalJSON, sha256Hex, ZERO_HASH } from './crypto';
import { FILLER_METHODS, mulberry32 } from './seed';

export type TxKind = 'filler' | 'anchor' | 'repair' | 'evidence';

export interface Tx {
  hash: string;
  kind: TxKind;
  from: string;
  to: string;
  method: string;
  args: Record<string, string | number | string[]>;
}

export interface Block {
  number: number;
  timestamp: number;
  parentHash: string;
  hash: string;
  txs: Tx[];
}

export const GENESIS_NUMBER = 18_342_096;
export const ANCHOR_CONTRACT = '0x7a3f…c0de';
export const LEDGERHOUND_SIGNER = '0x1d01…9e4b';

export interface PendingTx {
  kind: Exclude<TxKind, 'filler'>;
  method: string;
  args: Record<string, string | number | string[]>;
}

export class MockChain {
  blocks: Block[] = [];
  private rand: () => number;
  private nonce = 0;

  constructor(seed: number) {
    this.rand = mulberry32(seed);
  }

  private addr(): string {
    const h = Math.floor(this.rand() * 0xffffffff).toString(16).padStart(8, '0');
    const t = Math.floor(this.rand() * 0xffff).toString(16).padStart(4, '0');
    return `0x${h.slice(0, 4)}…${t}`;
  }

  async makeTx(p: PendingTx | null): Promise<Tx> {
    this.nonce++;
    if (!p) {
      const method = FILLER_METHODS[Math.floor(this.rand() * FILLER_METHODS.length)];
      const base = { kind: 'filler' as const, from: this.addr(), to: this.addr(), method, args: { value: Math.floor(this.rand() * 9000) + 100 } };
      return { ...base, hash: await sha256Hex(canonicalJSON({ ...base, nonce: this.nonce })) };
    }
    const base = { kind: p.kind, from: LEDGERHOUND_SIGNER, to: ANCHOR_CONTRACT, method: p.method, args: p.args };
    return { ...base, hash: await sha256Hex(canonicalJSON({ ...base, nonce: this.nonce })) };
  }

  async mine(pending: PendingTx[], timestamp: number): Promise<Block> {
    const parent = this.blocks[this.blocks.length - 1];
    const parentHash = parent ? parent.hash : ZERO_HASH;
    const number = parent ? parent.number + 1 : GENESIS_NUMBER;
    const fillerCount = 1 + Math.floor(this.rand() * 3);
    const txs: Tx[] = [];
    for (let i = 0; i < fillerCount; i++) txs.push(await this.makeTx(null));
    for (const p of pending) txs.splice(Math.floor(this.rand() * (txs.length + 1)), 0, await this.makeTx(p));
    const hash = await sha256Hex(parentHash + txs.map((t) => t.hash).join(''));
    const block: Block = { number, timestamp, parentHash, hash, txs };
    this.blocks.push(block);
    if (this.blocks.length > 48) this.blocks.shift();
    return block;
  }
}

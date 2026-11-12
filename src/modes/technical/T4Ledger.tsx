import { ArrowDown, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSim, currentRoot } from '../../sim/store';
import { RowTable } from '../../components/RowTable';
import { MerkleTree } from '../../components/MerkleTree';
import { BlockStrip } from '../../components/BlockStrip';
import { Button, Hash, fmtBlock } from '../../components/ui';
import { Panel, Section } from './shared';

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 text-[15px] font-semibold text-muted">
      <ArrowDown className="size-4" /> {label}
    </div>
  );
}

export function T4Ledger() {
  const root = useSim(currentRoot);
  const anchoredRoot = useSim((s) => s.anchoredRoot);
  const anchoredBlock = useSim((s) => s.anchoredBlock);
  const epoch = useSim((s) => s.epoch);
  const lastVerify = useSim((s) => s.lastVerify);
  const verify = useSim((s) => s.verifyRoot);
  const match = root === anchoredRoot;

  return (
    <Section
      n={4}
      title="Integrity Ledger: Merkle tree + chain"
      lead={
        <>
          16 watched rows → 16 leaf hashes <code className="font-mono">SHA256(0x00 ‖ canonicalJSON(row))</code> → pairwise nodes <code className="font-mono">SHA256(0x01 ‖ L ‖ R)</code> → one root, anchored on chain by{' '}
          <code className="font-mono">IntegrityAnchor.anchor(epoch, merkleRoot, auditHead)</code>. Only hashes go on chain, never data. Hover any leaf or node to see the real values.
        </>
      }
      plain="Every row gets a fingerprint. Fingerprints are combined pairwise until one master fingerprint remains. We write only that master fingerprint to the blockchain, where nobody can change it. If any single row changes, the master fingerprint changes."
    >
      <Panel title="Watched rows (read-only replica)">
        <RowTable compact />
      </Panel>
      <Arrow label="hash each row → combine pairwise" />
      <Panel
        title="Merkle tree"
        right={
          <div className="flex flex-wrap items-center gap-3">
            {lastVerify && (
              <motion.span key={lastVerify.at} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className={`text-[15px] font-semibold ${lastVerify.match ? 'text-ok' : 'text-warn'}`}>
                Recomputed in {lastVerify.ms.toFixed(1)} ms · {lastVerify.match ? 'matches on-chain root ✓' : 'differs from on-chain root'}
              </motion.span>
            )}
            <Button variant="primary" onClick={() => void verify()}>
              <RefreshCw className="size-4" /> Verify root
            </Button>
          </div>
        }
      >
        <MerkleTree />
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className={`rounded-xl border-2 p-4 ${match ? 'border-ok bg-ok-soft' : 'border-bad bg-bad-soft'}`}>
            <div className="text-[14px] font-semibold uppercase tracking-wide text-muted">Current root (computed now)</div>
            <Hash value={root} n={12} className={`mt-1 text-[16px] font-semibold ${match ? 'text-ok' : 'text-bad'}`} />
          </div>
          <div className="rounded-xl border-2 border-seal bg-seal-soft p-4">
            <div className="text-[14px] font-semibold uppercase tracking-wide text-muted">Anchored root · epoch {epoch} · block {fmtBlock(anchoredBlock)}</div>
            <Hash value={anchoredRoot} n={12} className="mt-1 text-[16px] font-semibold text-seal" />
          </div>
        </div>
      </Panel>
      <Arrow label="anchor the root each epoch" />
      <Panel title="Chain · LedgerHound transactions highlighted (click a block)">
        <BlockStrip />
      </Panel>
    </Section>
  );
}

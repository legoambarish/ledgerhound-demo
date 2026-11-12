import { motion } from 'framer-motion';
import { useSim, latestBlock, currentRoot, type Watch } from '../sim/store';
import { short } from '../sim/crypto';
import { fmtBlock } from './ui';

export const WATCH_META: Record<Watch, { label: string; dot: string; text: string }> = {
  intact: { label: 'Intact', dot: 'bg-ok', text: 'text-ok' },
  verifying: { label: 'Verifying…', dot: 'bg-warn', text: 'text-warn' },
  pending: { label: 'Verifying… (pending anchor)', dot: 'bg-warn', text: 'text-warn' },
  tamper: { label: 'Tamper detected', dot: 'bg-bad', text: 'text-bad' },
  repaired: { label: 'Repaired & sealed', dot: 'bg-seal', text: 'text-seal' },
};

export function StatusPill({ onOpen }: { onOpen: () => void }) {
  const watch = useSim((s) => s.watch);
  const block = useSim(latestBlock);
  const root = useSim(currentRoot);
  const m = WATCH_META[watch];
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      layout
      title="Open the Tamper Lab"
      className="fixed bottom-4 right-4 z-40 flex items-center gap-3 rounded-full border border-line bg-surface/95 py-2 pl-3 pr-4 text-[14px] shadow-card backdrop-blur transition hover:border-ink"
    >
      <span className="relative flex size-3">
        {watch !== 'intact' && <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${m.dot}`} />}
        <span className={`relative inline-flex size-3 rounded-full ${m.dot}`} />
      </span>
      <span className={`font-semibold ${m.text}`}>{m.label}</span>
      <span className="hidden font-mono text-muted tabular sm:inline">{fmtBlock(block?.number)}</span>
      <span className="hidden font-mono text-ink-2 sm:inline">root {short(root, 4)}</span>
    </motion.button>
  );
}

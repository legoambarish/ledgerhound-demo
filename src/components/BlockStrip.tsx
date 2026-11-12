import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link2 } from 'lucide-react';
import { useSim } from '../sim/store';
import type { Block } from '../sim/chain';
import { short } from '../sim/crypto';
import { fmtBlock } from './ui';

function txTone(b: Block) {
  if (b.txs.some((t) => t.kind === 'repair')) return 'repair';
  if (b.txs.some((t) => t.kind === 'anchor' || t.kind === 'evidence')) return 'anchor';
  return 'plain';
}

/** Horizontally scrolling chain of blocks. LedgerHound txs are highlighted. */
export function BlockStrip({ count = 14, simple = false }: { count?: number; simple?: boolean }) {
  const blocks = useSim((s) => s.blocks).slice(-count);
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTo({ left: el.scrollWidth, behavior: reduce ? 'auto' : 'smooth' });
  }, [blocks.length, blocks[blocks.length - 1]?.number, reduce]);

  const sel = blocks.find((b) => b.number === open);

  return (
    <div>
      <div ref={ref} className="flex items-stretch gap-0 overflow-x-auto pb-2 scrollbar-thin">
        <AnimatePresence initial={false}>
          {blocks.map((b, i) => {
            const tone = txTone(b);
            const ring = tone === 'repair' ? 'border-seal bg-seal text-white' : tone === 'anchor' ? 'border-seal bg-seal-soft' : 'border-line bg-surface';
            return (
              <motion.div
                key={b.number}
                layout={!reduce}
                initial={{ opacity: 0, x: reduce ? 0 : 40, scale: reduce ? 1 : 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                className="flex shrink-0 items-center"
              >
                {i > 0 && <Link2 className="mx-0.5 size-4 shrink-0 rotate-45 text-line-2" aria-hidden />}
                <button
                  type="button"
                  onClick={() => setOpen(open === b.number ? null : b.number)}
                  className={`flex ${simple ? 'w-[92px]' : 'w-[132px]'} flex-col gap-1.5 rounded-xl border-2 p-2.5 text-left transition hover:-translate-y-0.5 ${ring} ${open === b.number ? 'outline-2 outline-offset-2 outline-ink' : ''}`}
                  aria-label={`Block ${b.number}`}
                >
                  <span className={`font-mono text-[14px] font-bold tabular ${tone === 'repair' ? 'text-white' : 'text-ink'}`}>{simple ? '#' + String(b.number).slice(-3) : fmtBlock(b.number)}</span>
                  {!simple && <span className={`font-mono text-[14px] ${tone === 'repair' ? 'text-white/80' : 'text-muted'}`}>{short(b.hash, 3)}</span>}
                  <span className="flex flex-wrap gap-1">
                    {b.txs.map((t) => (
                      <span
                        key={t.hash}
                        title={t.kind === 'filler' ? `${t.method}()` : `IntegrityAnchor.${t.method}`}
                        className={`h-2 rounded-full ${t.kind === 'filler' ? (tone === 'repair' ? 'w-3 bg-white/40' : 'w-3 bg-line-2') : t.kind === 'repair' ? 'w-7 bg-white' : 'w-7 bg-seal'}`}
                      />
                    ))}
                  </span>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      {!simple && (
        <AnimatePresence>
          {sel && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="mt-2 rounded-xl border border-line bg-surface-2 p-4 font-mono text-[14px]">
                <div className="mb-2 text-ink">
                  Block {fmtBlock(sel.number)} · hash = SHA256(parentHash ‖ txHashes) = <span className="break-all">{short(sel.hash, 10)}</span>
                </div>
                <div className="text-muted">parent {short(sel.parentHash, 10)}</div>
                <ul className="mt-2 space-y-1">
                  {sel.txs.map((t) => (
                    <li key={t.hash} className={t.kind === 'filler' ? 'text-muted' : 'font-semibold text-seal'}>
                      {short(t.hash, 4)} · {t.kind === 'filler' ? `${t.from} → ${t.to} ${t.method}()` : `IntegrityAnchor.${t.method}(${Object.entries(t.args).map(([k, v]) => `${k}: ${Array.isArray(v) ? `[${v.join(', ')}]` : typeof v === 'string' && v.length > 20 ? short(v, 4) : v}`).join(', ')})`}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { Crosshair, Fingerprint, ShieldCheck, Settings2 } from 'lucide-react';
import { useSim, type SimEvent } from '../sim/store';

const PILLAR = {
  hunt: { icon: Crosshair, label: 'Hunt' },
  prove: { icon: Fingerprint, label: 'Prove' },
  protect: { icon: ShieldCheck, label: 'Protect' },
  system: { icon: Settings2, label: 'System' },
} as const;

const LEVEL: Record<SimEvent['level'], string> = {
  info: 'text-ink-2 bg-surface-2',
  ok: 'text-ok bg-ok-soft',
  warn: 'text-warn bg-warn-soft',
  alert: 'text-bad bg-bad-soft',
  chain: 'text-seal bg-seal-soft',
};

export function EventFeed({ limit = 40 }: { limit?: number }) {
  const events = useSim((s) => s.events).slice(0, limit);
  return (
    <ol className="space-y-2" aria-live="polite">
      <AnimatePresence initial={false}>
        {events.map((e) => {
          const P = PILLAR[e.pillar];
          return (
            <motion.li
              key={e.id}
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 rounded-xl border border-line bg-surface p-3"
            >
              <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${LEVEL[e.level]}`} title={P.label}>
                <P.icon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <div className="font-mono text-[14px] text-muted tabular">{new Date(e.t).toTimeString().slice(0, 8)} · {P.label}</div>
                <div className="text-[15px] leading-snug text-ink break-words">{e.text}</div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ol>
  );
}

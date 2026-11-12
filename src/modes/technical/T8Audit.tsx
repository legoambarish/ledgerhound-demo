import { motion } from 'framer-motion';
import { ArrowDown, EyeOff, RotateCcw, ShieldCheck } from 'lucide-react';
import { useSim } from '../../sim/store';
import { Button, Hash } from '../../components/ui';
import { Panel, Section } from './shared';

export function T8Audit() {
  const audit = useSim((s) => s.audit);
  const verify = useSim((s) => s.auditVerify);
  const edited = useSim((s) => s.auditEdited);
  const anchoredHead = useSim((s) => s.anchoredAuditHead);
  const anchoredIdx = useSim((s) => s.anchoredAuditIndex);
  const s = useSim.getState();
  const firstBroken = verify ? verify.results.indexOf('broken') : -1;

  return (
    <Section
      n={8}
      title="Audit log hash chain"
      lead={
        <>
          Every request an agent sends becomes an entry; <code className="font-mono">entryHash = SHA256(prevHash ‖ canonicalJSON(entry))</code>. The chain head is anchored on chain each epoch, so reviewers can replay everything and prove nothing was hidden or edited.
        </>
      }
      plain="Like numbered, glued pages — remove or change one and every page after it stops matching."
      aside={
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void s.verifyAudit()}>
            <ShieldCheck className="size-4" /> Verify chain
          </Button>
          {edited === null ? (
            <Button variant="danger" onClick={() => s.coverUp(3)}>
              <EyeOff className="size-4" /> Edit an entry (simulate a cover-up)
            </Button>
          ) : (
            <Button variant="ghost" onClick={s.restoreAudit}>
              <RotateCcw className="size-4" /> Undo cover-up
            </Button>
          )}
        </div>
      }
    >
      <Panel title="Anchored audit head">
        <div className="flex flex-wrap items-center gap-4 text-[16px]">
          <span className="text-ink-2">On chain (entry #{anchoredIdx + 1}):</span>
          <Hash value={anchoredHead} n={10} className="font-semibold text-seal" />
          {verify && (
            <motion.span key={verify.ranAt} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`rounded-full px-3.5 py-1 font-semibold ${verify.headOk ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
              recomputed {verify.recomputedAnchored.slice(0, 8)}… {verify.headOk ? '= anchored ✓' : '≠ anchored ✗ — log was altered'}
            </motion.span>
          )}
        </div>
      </Panel>

      <ol className="space-y-0">
        {audit.map((r, i) => {
          const res = verify?.results[i];
          const tone = !verify ? 'border-line' : res === 'ok' ? 'border-ok' : 'border-bad';
          const bg = !verify ? 'bg-surface' : res === 'ok' ? 'bg-ok-soft/40' : 'bg-bad-soft';
          return (
            <li key={r.entry.seq}>
              {i > 0 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className={`size-5 ${verify && res === 'broken' ? 'text-bad' : 'text-line-2'}`} />
                </div>
              )}
              <motion.div
                initial={false}
                animate={{ x: verify && res === 'broken' && i === firstBroken ? [0, -6, 6, -3, 0] : 0 }}
                transition={{ delay: verify && res === 'broken' ? (i - firstBroken) * 0.12 : i * 0.05 }}
                className={`grid gap-3 rounded-2xl border-2 p-4 transition-colors duration-500 md:grid-cols-[auto_1fr_auto] md:items-center ${tone} ${bg}`}
                style={{ transitionDelay: verify ? `${(firstBroken >= 0 && i >= firstBroken ? i - firstBroken : i) * 90}ms` : '0ms' }}
              >
                <span className="font-mono text-[15px] font-bold text-muted">#{r.entry.seq}</span>
                <div className="min-w-0">
                  <div className="font-mono text-[15px] text-ink">
                    <b>{r.entry.method}</b> {r.entry.path} → {r.entry.status}
                    {edited === i && <span className="ml-2 rounded bg-bad px-1.5 text-[14px] font-semibold text-white">edited</span>}
                  </div>
                  <div className="text-[15px] text-muted">
                    {r.entry.ts} · agent <b className="text-ink-2">{r.entry.agent}</b> · {r.entry.note}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[14px] text-muted">
                  prev <Hash value={r.prevHash} n={3} /> → <Hash value={r.hash} n={3} className="font-semibold text-ink" />
                  {i === anchoredIdx && <span className="rounded-full bg-seal px-2 py-0.5 font-sans text-[14px] font-semibold text-white">anchored head</span>}
                </div>
              </motion.div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

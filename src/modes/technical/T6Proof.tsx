import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, RotateCcw, Play } from 'lucide-react';
import { useSim } from '../../sim/store';
import { Button, Hash } from '../../components/ui';
import { Panel, Section } from './shared';

function Box({ label, tone, children, on }: { label: string; tone: 'ok' | 'bad' | 'muted' | 'seal'; children: React.ReactNode; on: boolean }) {
  const map = { ok: 'border-ok bg-ok-soft', bad: 'border-bad bg-bad-soft', muted: 'border-line bg-surface-2', seal: 'border-seal bg-seal-soft' };
  return (
    <motion.div animate={{ opacity: on ? 1 : 0.35, scale: on ? 1 : 0.98 }} className={`min-w-0 flex-1 rounded-2xl border-2 p-4 ${map[tone]}`}>
      <div className="text-[14px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2">{children}</div>
    </motion.div>
  );
}

export function T6Proof() {
  const proof = useSim((s) => s.hunt.proof);
  const replay = useSim((s) => s.replayProof);
  const ph = proof.phase;
  const attacked = ph === 'attacked' || ph === 'reverted';
  const reverted = ph === 'reverted';

  return (
    <Section
      n={6}
      title="Prove: state-change evidence for F-12"
      lead="Before an approved test, the verifier records the Merkle root. After it, it records the root again. A difference — and the exact row diff — is the proof. The test write is journaled as the agent’s own, then reverted automatically."
      plain="Scanners judge an attack by the reply it gets. But “200 OK” doesn’t say whether anything bad actually happened. We compare a fingerprint of the data before and after, so we can point at the exact row the attack changed — and then put it back."
      aside={
        <Button variant="primary" onClick={replay} disabled={ph === 'before' || ph === 'attacked'}>
          <Play className="size-4 fill-current" /> Re-run F-12 verification
        </Button>
      }
    >
      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center">
        <Box label="1 · Root before" tone="ok" on={ph !== 'idle'}>
          <Hash value={proof.beforeRoot ?? ''} n={8} className="text-[16px] font-semibold text-ok" />
        </Box>
        <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-muted lg:rotate-0" />
        <Box label="2 · Attack request" tone="muted" on={attacked}>
          <pre className="whitespace-pre-wrap font-mono text-[14px] leading-snug text-ink">
            {'PATCH /v3/users/u-3\n'}
            <span className="text-muted">{'Authorization: Bearer <sub_agent test token>\n'}</span>
            {'{"role":"admin"}'}
          </pre>
          <div className="mt-2 inline-block rounded-md bg-ok px-2 py-0.5 font-mono text-[14px] font-bold text-white">HTTP 200 OK</div>
        </Box>
        <ArrowRight className="mx-auto size-5 shrink-0 rotate-90 text-muted lg:rotate-0" />
        <Box label="3 · Root after" tone="bad" on={attacked}>
          <Hash value={proof.afterRoot ?? ''} n={8} className="text-[16px] font-semibold text-bad" />
          {attacked && <div className="mt-1 text-[15px] font-semibold text-bad">≠ root before</div>}
        </Box>
      </div>

      <Panel title="Row-level diff">
        <AnimatePresence mode="wait">
          {attacked ? (
            <motion.div key="diff" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center gap-3 font-mono text-[18px]">
              <span className="text-ink">users.u-3.role:</span>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-ink-2 line-through">sub_agent</span>
              <ArrowRight className="size-5 text-muted" />
              <motion.span initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="rounded-md bg-bad px-2 py-0.5 font-bold text-white">
                admin
              </motion.span>
              <span className="w-full text-[15px] text-muted">1 of 16 leaves changed · only this row · exploit confirmed with zero data extracted</span>
            </motion.div>
          ) : (
            <motion.p key="none" className="text-[16px] text-muted">Press “Re-run F-12 verification”.</motion.p>
          )}
        </AnimatePresence>
      </Panel>

      <Panel title="4 · Auto-revert (safe autonomy)">
        <div className="flex flex-wrap items-center gap-4">
          <span className={`grid size-11 place-items-center rounded-xl ${reverted ? 'bg-ok text-white' : 'bg-surface-2 text-muted'}`}>
            <RotateCcw className="size-5" />
          </span>
          <div className="min-w-0">
            <div className="text-[16px] text-ink-2">Root after revert</div>
            <Hash value={proof.revertedRoot ?? ''} n={8} className="text-[16px] font-semibold text-ok" />
          </div>
          {reverted && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-full bg-ok-soft px-3.5 py-1.5 text-[15px] font-semibold text-ok">
              {proof.revertedRoot === proof.beforeRoot ? '= root before ✓ — platform left exactly as found' : 'reverted ✓'}
            </motion.span>
          )}
        </div>
      </Panel>

      <div className="rounded-2xl bg-ink p-6 text-center font-display text-[22px] font-bold leading-snug text-paper md:text-[28px]">
        “The HTTP response says nothing. The data diff proves the exploit.”
      </div>
    </Section>
  );
}

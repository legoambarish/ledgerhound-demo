import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, ChevronDown, Link2, RefreshCw } from 'lucide-react';
import { useSim } from '../../sim/store';
import type { Finding, Severity } from '../../sim/seed';
import { Badge, Button, fmtBlock } from '../../components/ui';
import { Panel, Section } from './shared';

const SEV: Record<Severity, 'bad' | 'warn' | 'seal' | 'muted'> = { critical: 'bad', high: 'warn', medium: 'seal', low: 'muted' };

function FindingCard({ f }: { f: Finding }) {
  const [open, setOpen] = useState(f.id === 'F-12');
  const retest = useSim((s) => s.retest);
  const retesting = useSim((s) => s.hunt.retesting);
  const anchoredBlock = useSim((s) => s.anchoredBlock);
  const closed = f.status === 'closed';
  return (
    <motion.div layout className={`rounded-2xl border-2 bg-surface shadow-card transition ${closed ? 'border-ok' : 'border-line'}`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[15px] font-bold text-ink">{f.id}</span>
            <Badge tone={SEV[f.severity]}>{f.severity}</Badge>
            <Badge tone={closed ? 'ok' : f.status === 'fixed' ? 'seal' : 'muted'}>{closed ? 'retested · closed' : f.status}</Badge>
            {f.duplicatesMerged > 0 && <span className="text-[14px] text-muted">+{f.duplicatesMerged} duplicate{f.duplicatesMerged > 1 ? 's' : ''} merged</span>}
          </div>
          <div className="mt-1.5 text-[17px] font-semibold leading-snug text-ink">{f.title}</div>
          <div className="mt-1 text-[15px] text-muted">
            <span className="font-mono">{f.endpoint}</span> · owner <b className="text-ink-2">{f.owner}</b>
          </div>
        </div>
        {closed ? <CheckCircle2 className="size-7 shrink-0 text-ok" /> : <ChevronDown className={`size-5 shrink-0 text-muted transition ${open ? 'rotate-180' : ''}`} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line p-4 text-[15px]">
              <div><span className="font-semibold text-ink">Business impact: </span><span className="text-ink-2">{f.businessContext}</span></div>
              <div className="grid gap-2 md:grid-cols-2">
                <pre className="whitespace-pre-wrap rounded-xl bg-ink p-3 font-mono text-[14px] leading-snug text-paper">{f.request}</pre>
                <pre className="whitespace-pre-wrap rounded-xl bg-surface-2 p-3 font-mono text-[14px] leading-snug text-ink">{f.response}</pre>
              </div>
              {f.diff && (
                <div className="rounded-xl bg-bad-soft px-3 py-2 font-mono text-[14px] font-semibold text-bad">DB diff: {f.diff}</div>
              )}
              <div className="flex items-center gap-2 text-seal">
                <Link2 className="size-4" /> Evidence + audit head anchored in block {fmtBlock(f.txBlock ?? anchoredBlock)}
              </div>
              <div><span className="font-semibold text-ink">Suggested fix: </span><span className="text-ink-2">{f.fix}</span></div>
              {f.recommendation && <div><span className="font-semibold text-ink">Recommendation: </span><Badge tone="bad">{f.recommendation}</Badge></div>}
              {!closed && (
                <Button variant="primary" onClick={() => retest(f.id)} disabled={!!retesting}>
                  <RefreshCw className={`size-4 ${retesting === f.id ? 'animate-spin' : ''}`} /> {retesting === f.id ? 'Retesting…' : 'Mark fixed → Retest'}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function T7Findings() {
  const findings = useSim((s) => s.findings);
  const order: Severity[] = ['critical', 'high', 'medium', 'low'];
  const sorted = [...findings].sort((a, b) => (a.status === 'closed' ? 1 : 0) - (b.status === 'closed' ? 1 : 0) || order.indexOf(a.severity) - order.indexOf(b.severity));
  const open = findings.filter((f) => f.status !== 'closed').length;

  return (
    <Section
      n={7}
      title="Findings & tickets"
      lead="Triage merges duplicates, scores severity by what the endpoint means for the business, and routes each finding to its owner with evidence and a fix. After a fix ships, the retest agent reruns the proof and closes it."
      plain="A finding is only useful if the right team can fix it today. Each one says what’s broken, why it matters to the business, who owns it, the exact evidence, and how to fix it. When the fix ships, we check it again automatically."
      aside={<div className="text-[16px] text-ink-2"><b className="font-display text-[28px] text-ink">{open}</b> open · {findings.length - open} closed</div>}
    >
      <Panel title="Same bug class, different business severity">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[620px] text-left text-[15px]">
            <thead className="text-[14px] uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3">Bug class</th>
                <th className="py-2 pr-3">Endpoint</th>
                <th className="py-2 pr-3">What it touches</th>
                <th className="py-2">Severity</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-2.5 pr-3 font-semibold text-ink">Missing idempotency</td>
                <td className="py-2.5 pr-3 font-mono">POST /v3/refunds</td>
                <td className="py-2.5 pr-3 text-ink-2">Money leaves the wallet each replay</td>
                <td className="py-2.5"><Badge tone="bad">critical</Badge></td>
              </tr>
              <tr className="border-b border-line">
                <td className="py-2.5 pr-3 font-semibold text-ink">Missing idempotency</td>
                <td className="py-2.5 pr-3 font-mono">GET /v3/search/flights</td>
                <td className="py-2.5 pr-3 text-ink-2">Public fares; a repeat costs nothing</td>
                <td className="py-2.5"><Badge tone="muted">low</Badge></td>
              </tr>
              <tr>
                <td className="py-2.5 pr-3 font-semibold text-ink">IDOR</td>
                <td className="py-2.5 pr-3 font-mono">GET /v3/bookings/{'{id}'}</td>
                <td className="py-2.5 pr-3 text-ink-2">Another agency’s traveller PII</td>
                <td className="py-2.5"><Badge tone="warn">high</Badge></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        {sorted.map((f) => (
          <FindingCard key={f.id} f={f} />
        ))}
      </div>
    </Section>
  );
}

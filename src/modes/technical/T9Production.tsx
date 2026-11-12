import { Check } from 'lucide-react';
import { Panel, Section } from './shared';

const ROWS: [string, string, string][] = [
  ['Hunt agents', 'Scripted scenarios driven by a timeline', 'Python agents + LLM planner, wrapping ZAP / Nuclei where useful'],
  ['App knowledge graph', 'Seeded endpoints, params, roles', 'Built from UI crawl per role, HAR, JS bundles, 90-day gateway logs'],
  ['Change journal', 'In-memory list of app writes', 'Postgres logical decoding (wal2json) from the app’s DB role'],
  ['Merkle tree & hashes', 'Real SHA-256 in your browser (WebCrypto)', 'Same construction, streaming over watched tables'],
  ['IntegrityAnchor contract', 'Mock EVM chain, ~4 s blocks', 'Solidity contract on Anvil, then Base Sepolia / a public L2'],
  ['Snapshot vault', 'Copy of last anchored rows', 'MinIO / S3 Object Lock (WORM), encrypted'],
  ['Watchdog', 'Same tab as the UI', 'Separate host, read-only credentials, out-of-band'],
  ['Audit log', 'Hash chain in memory', 'Hash chain in append-only storage, head anchored every epoch'],
];

const CRITERIA: [string, string, string][] = [
  ['Valid findings & severity', '30%', 'Business-logic flaws (fare, refund replay, escalation, IDOR) with business-context severity'],
  ['Precision & noise control', '20%', 'State-change proof: a finding needs a real row diff, not just a 200 OK'],
  ['Safety & scope discipline', '20%', 'Allowlist, rate limit, health backoff, kill switch, human approval, auto-revert, audit chain'],
  ['Speed after change', '10%', 'Change detector + targeted planning: deploy → verified finding in minutes'],
  ['Report quality & actionability', '10%', 'Tickets with owner, evidence, chain link, fix; automatic retest'],
  ['Discovery & API inventory', '10%', 'Docs-free mapping, active / zombie / shadow labels, generated OpenAPI'],
];

export function T9Production() {
  return (
    <Section
      n={9}
      title="From demo to production"
      lead="What you just saw is simulated where it has to be and real where it matters. Here is the honest map to the real build."
      plain="This website plays the story out with pretend data, but the fingerprints are real maths. In the real product the agents test a real staging platform, the watchdog runs on its own server, and only the fingerprints — never any customer data — go on a public blockchain."
    >
      <Panel title="Simulated here vs. the real build">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[720px] text-left text-[16px]">
            <thead className="text-[14px] uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4">Component</th>
                <th className="py-2 pr-4">In this demo</th>
                <th className="py-2">Production</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([a, b, c]) => (
                <tr key={a} className="border-b border-line last:border-0">
                  <td className="py-3 pr-4 font-semibold text-ink">{a}</td>
                  <td className="py-3 pr-4 text-muted">{b}</td>
                  <td className="py-3 text-ink-2">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Cost">
          <p className="text-[17px] text-ink-2">
            One <code className="font-mono">anchor()</code> transaction per epoch, plus a receipt only when something is repaired. On a public L2 that is roughly <b className="text-ink">cents per day</b>.
          </p>
        </Panel>
        <Panel title="Honest limits">
          <ul className="space-y-2 text-[17px] text-ink-2">
            {[
              'Only hashes go on chain. PII never touches the chain — GDPR-friendly.',
              'This demo uses a local mock chain (Anvil in the real build); production anchors to a public L2.',
              'The watchdog must run on a different host from the database, with read-only credentials.',
              'Rows changed between epochs are protected by the journal check, not by the chain alone.',
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="mt-1 size-4 shrink-0 text-ok" /> {t}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="How it maps to the judging criteria">
        <div className="grid gap-3 md:grid-cols-2">
          {CRITERIA.map(([c, w, how]) => (
            <div key={c} className="flex gap-4 rounded-xl border border-line p-4">
              <span className="font-display text-[26px] font-extrabold leading-none text-accent tabular">{w}</span>
              <div>
                <div className="text-[17px] font-semibold text-ink">{c}</div>
                <div className="mt-0.5 text-[15px] text-ink-2">{how}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Section>
  );
}

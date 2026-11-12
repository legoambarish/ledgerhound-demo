import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, BadgeIndianRupee, Check, Crosshair, Eye, Fingerprint, Loader2, Lock, ShieldCheck, Siren, Smile, UserCog, X } from 'lucide-react';
import { useSim, type Incident } from '../../sim/store';
import { CHEAT_ORDER, SCENARIOS, STAGE_CAPTIONS, type ScenarioId, type StageKey } from '../../sim/scenarios';
import { ROW_IDS, type Row } from '../../sim/seed';
import { short } from '../../sim/crypto';
import { BlockStrip } from '../../components/BlockStrip';
import { fmtBlock, fmtINR, Reveal } from '../../components/ui';

const ICONS: Record<ScenarioId, typeof Eye> = {
  'fare-to-one': BadgeIndianRupee,
  'make-me-admin': UserCog,
  'double-refund': BadgeIndianRupee,
  'peek-other-agency': Eye,
  'legit-booking': Smile,
  deploy: Crosshair,
};

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 150);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

const fmtVal = (field: string, v: string | number) => (field === 'fare' || field === 'amount' ? fmtINR(Number(v)) : String(v));

function Lane({ n, title, tone, children, caption }: { n: number; title: string; tone: 'bad' | 'ok' | 'seal' | 'warn' | 'muted'; children: ReactNode; caption: string }) {
  const bar = { bad: 'bg-bad', ok: 'bg-ok', seal: 'bg-seal', warn: 'bg-warn', muted: 'bg-line-2' }[tone];
  return (
    <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
      <motion.div className={`h-1.5 ${bar}`} layout />
      <div className="flex items-center gap-3 px-5 pt-4">
        <span className="grid size-8 place-items-center rounded-full bg-ink font-display text-[16px] font-bold text-paper">{n}</span>
        <span className="font-display text-[20px] font-bold text-ink">{title}</span>
      </div>
      <div className="relative min-h-[250px] flex-1 px-5 py-4">{children}</div>
      <div className="min-h-[86px] border-t border-line bg-surface-2 px-5 py-3.5">
        <AnimatePresence mode="wait">
          <motion.p key={caption} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="text-[17px] leading-snug text-ink-2">
            {caption}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

function RowCard({ row, highlight, newVal, tone }: { row: Row; highlight?: string; newVal?: string | number; tone?: 'bad' | 'ok' }) {
  const entries = Object.entries(row).filter(([k]) => k !== 'table' && k !== 'id');
  return (
    <div className="rounded-xl border border-line bg-surface-2 p-3.5">
      <div className="mb-2 flex items-center justify-between font-mono text-[15px]">
        <span className="text-muted">{row.table}</span>
        <span className="font-semibold text-ink">{row.id}</span>
      </div>
      <dl className="space-y-1">
        {entries.map(([k, v]) => {
          const hit = k === highlight;
          return (
            <div key={k} className={`flex items-center justify-between gap-3 rounded-md px-2 py-0.5 text-[16px] ${hit ? (tone === 'ok' ? 'bg-ok-soft' : 'bg-bad-soft') : ''}`}>
              <dt className="font-mono text-muted">{k}</dt>
              <dd className="flex items-center gap-2 font-mono font-semibold text-ink tabular">
                {hit && newVal !== undefined ? (
                  <>
                    <span className="text-muted line-through">{fmtVal(k, v as string | number)}</span>
                    <motion.span initial={{ scale: 1.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={tone === 'ok' ? 'text-ok' : 'text-bad'}>
                      {fmtVal(k, newVal)}
                    </motion.span>
                  </>
                ) : (
                  fmtVal(k, v as string | number)
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function MiniGrid({ hot, tone }: { hot: string[]; tone: 'bad' | 'ok' | 'warn' }) {
  const reduce = useReducedMotion();
  const color = { bad: 'bg-bad', ok: 'bg-ok', warn: 'bg-warn' }[tone];
  return (
    <div className="grid grid-cols-8 gap-1.5" aria-label="16 watched rows">
      {ROW_IDS.map((id) => {
        const h = hot.includes(id);
        return (
          <div key={id} className="relative">
            <motion.div className={`h-5 rounded ${h ? color : 'bg-line'}`} animate={{ scale: h && !reduce ? [1, 1.25, 1] : 1 }} transition={{ duration: 0.6, repeat: h ? 2 : 0 }} />
            {h && !reduce && <span className={`absolute inset-0 animate-ping rounded ${color} opacity-40`} />}
          </div>
        );
      })}
    </div>
  );
}

function Fingerprints({ live, sealed }: { live: string; sealed: string }) {
  const match = live === sealed;
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <div className="rounded-xl border border-line bg-surface-2 p-2.5 text-center">
        <div className="text-[15px] text-muted">Your data now</div>
        <div className={`font-mono text-[17px] font-semibold ${match ? 'text-ok' : 'text-bad'}`}>{short(live, 3)}</div>
      </div>
      <motion.span key={String(match)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className={`grid size-9 place-items-center rounded-full text-white ${match ? 'bg-ok' : 'bg-bad'}`}>
        {match ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
      </motion.span>
      <div className="rounded-xl border border-seal/40 bg-seal-soft p-2.5 text-center">
        <div className="text-[15px] text-seal">Sealed copy</div>
        <div className="font-mono text-[17px] font-semibold text-seal">{short(sealed, 3)}</div>
      </div>
    </div>
  );
}

function BigState({ icon: Icon, tone, title, spin }: { icon: typeof Eye; tone: 'bad' | 'ok' | 'seal' | 'warn' | 'muted'; title: string; spin?: boolean }) {
  const map = { bad: 'bg-bad text-white', ok: 'bg-ok text-white', seal: 'bg-seal text-white', warn: 'bg-warn-soft text-warn', muted: 'bg-surface-2 text-muted' }[tone];
  return (
    <motion.div key={title} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3">
      <span className={`grid size-12 place-items-center rounded-2xl ${map}`}>
        <Icon className={`size-6 ${spin ? 'animate-spin' : ''}`} aria-hidden />
      </span>
      <span className="font-display text-[22px] font-bold leading-tight text-ink">{title}</span>
    </motion.div>
  );
}

function stageFor(kind: string, stepIdx: number, inc: Incident | null, now: number, autoRepair: boolean): StageKey {
  if (stepIdx < 1) return 'waiting';
  if (!inc) return 'detecting';
  if (kind === 'legit') return inc.status === 'anchored' ? 'anchored' : 'legit';
  if (inc.status === 'detected') {
    if (!autoRepair) return now - inc.detectedAt < 700 ? 'tamper' : 'manual';
    return now - inc.detectedAt < 600 ? 'tamper' : 'repairing';
  }
  if (inc.status === 'repaired') return 'repaired';
  if (inc.status === 'sealed') return 'sealed';
  if (inc.status === 'resolved') return 'repaired';
  return 'detecting';
}

export function CheatLab() {
  const sc = useSim((s) => s.scenario);
  const rows = useSim((s) => s.rows);
  const vault = useSim((s) => s.vault);
  const incidents = useSim((s) => s.incidents);
  const levels = useSim((s) => s.levels);
  const anchoredRoot = useSim((s) => s.anchoredRoot);
  const autoRepair = useSim((s) => s.settings.autoRepair);
  const run = useSim((s) => s.runScenario);
  const id = sc && CHEAT_ORDER.includes(sc.id) ? sc.id : null;
  const def = id ? SCENARIOS[id] : null;
  const now = useNow(!!def && !sc?.done);

  let inc: Incident | null = null;
  if (sc && def) {
    if (sc.incidentId) inc = incidents.find((i) => i.id === sc.incidentId) ?? null;
    else if (def.kind === 'legit') inc = incidents.find((i) => i.kind === 'legit' && i.startedAt >= sc.startedAt) ?? null;
  }
  const stepIdx = sc?.stepIdx ?? -1;
  const stage = def ? stageFor(def.kind, stepIdx, inc, now, autoRepair) : 'waiting';
  const liveRoot = levels.length ? levels[levels.length - 1][0] : '';

  const lane1Caption = def ? [...def.steps].filter((s, i) => i <= stepIdx && (s.lane ?? 1) === 1).pop()?.plain ?? def.steps[0].plain : 'Pick a cheat above. Each one plays out across all three lanes.';
  const huntCaption = (lane: 2 | 3) => (def ? [...def.steps].filter((s, i) => i <= stepIdx && s.lane === lane).pop()?.plain : undefined);

  // ---------------- lane contents
  let lane1: ReactNode = <Placeholder text="The attacker’s screen shows up here." />;
  let lane2: ReactNode = <BigState icon={ShieldCheck} tone="ok" title="Watching all 16 rows" />;
  const receiptBlock = def?.kind === 'tamper' ? inc?.sealedBlock : def?.kind === 'legit' ? inc?.anchoredBlock : sc?.sealBlock;
  const receiptLabel = def?.kind === 'tamper' ? 'Repair receipt' : def?.kind === 'legit' ? 'New fingerprint' : 'Evidence + request log';
  let lane3: ReactNode = (
    <div className="space-y-4">
      <Fingerprints live={liveRoot} sealed={anchoredRoot} />
      <BlockStrip simple count={4} />
      <AnimatePresence>
        {receiptBlock && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            className="flex items-center gap-3 rounded-xl bg-seal p-3.5 text-white"
          >
            <Lock className="size-5 shrink-0" />
            <div>
              <div className="text-[15px] opacity-80">{receiptLabel} sealed in</div>
              <div className="font-mono text-[18px] font-bold tabular">{fmtBlock(receiptBlock)}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  let tone2: 'bad' | 'ok' | 'seal' | 'warn' | 'muted' = 'muted';
  let tone3: 'bad' | 'ok' | 'seal' | 'warn' | 'muted' = 'muted';
  let cap2: string = STAGE_CAPTIONS.waiting.plain;
  let cap3: string = 'Every few seconds a fingerprint of all your data is sealed on a blockchain.';

  if (def && (def.kind === 'tamper') && def.rowId) {
    const step = def.steps.find((s) => s.action?.type === 'tamper');
    const patch = step?.action?.type === 'tamper' ? step.action.patch : {};
    const field = Object.keys(patch)[0];
    const orig = vault.find((r) => r.id === def.rowId)!;
    const tampered = stepIdx >= 1;
    lane1 = (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-bad">
          <span className="size-2 rounded-full bg-bad" /> Direct database access
        </div>
        <RowCard row={orig} highlight={tampered ? field : undefined} newVal={tampered ? patch[field] : undefined} />
        {tampered && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full bg-ink px-3 py-1 text-[15px] font-semibold text-paper">
            <Check className="size-4" /> Saved
          </motion.div>
        )}
      </div>
    );
    const cur = rows.find((r) => r.id === def.rowId)! as unknown as Record<string, string | number>;
    if (stage === 'waiting') {
      lane2 = <BigState icon={ShieldCheck} tone="ok" title="Watching all 16 rows" />;
    } else if (stage === 'detecting') {
      tone2 = 'warn';
      lane2 = <BigState icon={Loader2} spin tone="warn" title="Checking the fingerprint…" />;
    } else if (stage === 'tamper') {
      tone2 = 'bad';
      lane2 = (
        <div className="space-y-5">
          <BigState icon={Siren} tone="bad" title="Alarm!" />
          <MiniGrid hot={[def.rowId]} tone="bad" />
        </div>
      );
    } else if (stage === 'repairing' || stage === 'manual') {
      tone2 = 'bad';
      lane2 = (
        <div className="space-y-4">
          <BigState icon={Crosshair} tone="bad" title={`Found it: ${def.rowId} · ${field}`} />
          <MiniGrid hot={[def.rowId]} tone="bad" />
          <div className="font-mono text-[16px] text-bad">{fmtVal(field, cur[field])} ≠ sealed {fmtVal(field, (orig as unknown as Record<string, string | number>)[field])}</div>
        </div>
      );
    } else {
      tone2 = 'ok';
      lane2 = (
        <div className="space-y-4">
          <BigState icon={Check} tone="ok" title="Snapped back" />
          <RowCard row={rows.find((r) => r.id === def.rowId)!} highlight={field} tone="ok" />
        </div>
      );
    }
    cap2 = STAGE_CAPTIONS[stage].plain;
    if (stage === 'tamper' || stage === 'repairing' || stage === 'manual') {
      tone3 = 'bad';
      cap3 = 'The data’s fingerprint no longer matches the sealed one.';
    } else if (stage === 'repaired') {
      tone3 = 'warn';
      cap3 = 'Fingerprints match again. Writing a repair receipt…';
    } else if (stage === 'sealed') {
      tone3 = 'seal';
      cap3 = `Repair receipt sealed in block ${fmtBlock(inc?.sealedBlock)}. Nobody can edit it.`;
    }
  } else if (def && def.kind === 'legit') {
    const change = inc?.changes[0];
    const targetId = change?.rowId ?? (rows.find((r) => r.table === 'bookings' && r.status === 'held') ?? rows[0]).id;
    const row = (inc ? vault.find((r) => r.id === targetId) : rows.find((r) => r.id === targetId)) as Extract<Row, { table: 'bookings' }>;
    const done = stepIdx >= 1;
    lane1 = (
      <div className="rounded-2xl border border-line bg-surface-2 p-4">
        <div className="text-[15px] font-semibold text-accent">TripGrid app</div>
        <div className="font-display mt-1 text-[24px] font-bold text-ink">{row?.route}</div>
        <div className="text-[16px] text-muted">{row?.traveller} · {row?.agency}</div>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[18px] font-semibold text-ink tabular">{row ? fmtINR(row.fare) : ''}</span>
          <motion.span
            animate={{ scale: done ? [1, 0.92, 1] : 1 }}
            className={`rounded-full px-4 py-2 text-[16px] font-semibold ${done ? 'bg-ok text-white' : 'bg-ink text-paper'}`}
          >
            {done ? `${change ? String(change.after) : 'confirmed'} ✓` : 'Pay & confirm'}
          </motion.span>
        </div>
      </div>
    );
    if (stage === 'detecting') {
      tone2 = 'warn';
      lane2 = <BigState icon={Loader2} spin tone="warn" title="Checking the fingerprint…" />;
    } else if (stage === 'legit' || stage === 'anchored') {
      tone2 = 'ok';
      lane2 = (
        <div className="space-y-4">
          <BigState icon={Smile} tone="ok" title="Expected change. No alarm." />
          <MiniGrid hot={inc ? inc.rowIds : []} tone="warn" />
          <div className="rounded-xl bg-ok-soft p-3 text-[16px] text-ok">
            The app’s own logbook explains it: <b>{targetId}</b> {change ? `${change.before} → ${change.after}` : ''}
          </div>
        </div>
      );
    }
    cap2 = STAGE_CAPTIONS[stage].plain;
    if (stage === 'legit') {
      tone3 = 'warn';
      cap3 = 'Fingerprint changed — for a good reason. It gets sealed at the next checkpoint.';
    } else if (stage === 'anchored') {
      tone3 = 'seal';
      cap3 = `New fingerprint sealed in block ${fmtBlock(inc?.anchoredBlock)}.`;
    }
  } else if (def && def.kind === 'hunt') {
    const swapped = stepIdx >= 1;
    lane1 = (
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-hidden rounded-xl border border-line bg-surface-2 px-3 py-2.5 font-mono text-[16px]">
          <span className="text-muted">tripgrid.app/bookings/</span>
          <AnimatePresence mode="wait">
            <motion.span key={String(swapped)} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className={`rounded px-1 font-semibold ${swapped ? 'bg-bad text-white' : 'text-ink'}`}>
              {swapped ? 'b-1005' : 'b-1001'}
            </motion.span>
          </AnimatePresence>
        </div>
        <motion.div layout className={`rounded-xl border-2 p-3.5 ${swapped ? 'border-bad bg-bad-soft' : 'border-line bg-surface'}`}>
          <div className={`text-[15px] font-semibold ${swapped ? 'text-bad' : 'text-ok'}`}>{swapped ? 'BlueOrbit Tours — not your agency!' : 'Skyline Travels · your booking'}</div>
          <div className="font-display mt-1 text-[20px] font-bold text-ink">{swapped ? 'HYD → LHR' : 'BLR → DEL'}</div>
          <div className="text-[16px] text-muted">{swapped ? 'Sana Q. · ₹37,650' : 'Ishita R. · ₹6,840'}</div>
        </motion.div>
      </div>
    );
    if (stepIdx >= 2) {
      tone2 = stepIdx >= 3 ? 'ok' : 'bad';
      lane2 = (
        <div className="space-y-4">
          <BigState icon={stepIdx >= 3 ? Check : Crosshair} tone={stepIdx >= 3 ? 'ok' : 'bad'} title={stepIdx >= 3 ? 'Proven. Ticket filed.' : 'Hunt agent reproduces it'} />
          <div className="rounded-xl border border-line bg-surface-2 p-3 font-mono text-[15px] leading-relaxed text-ink-2">
            test account: Skyline<br />
            asked for: b-1005 → got <span className="font-semibold text-bad">BlueOrbit</span> data<br />
            evidence: 1 record, masked
          </div>
          {stepIdx >= 3 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 rounded-full bg-ink px-3.5 py-1.5 text-[15px] font-semibold text-paper">
              F-04 → Booking team
            </motion.div>
          )}
        </div>
      );
    } else {
      lane2 = <BigState icon={Crosshair} tone="muted" title="Hunt agents on patrol" />;
    }
    cap2 = huntCaption(2) ?? 'Our agents try these tricks first, with test accounts, after every release.';
    if (stepIdx >= 4) {
      tone3 = sc?.sealBlock ? 'seal' : 'warn';
      cap3 = sc?.sealBlock ? `Evidence and the agent’s request log sealed in block ${fmtBlock(sc.sealBlock)}.` : huntCaption(3) ?? '';
    }
  }

  const endText = (() => {
    if (!def || !sc?.done) return null;
    if (def.kind === 'legit') return { big: 'Normal business. No false alarm.', small: `The new state was sealed in block ${fmtBlock(inc?.anchoredBlock ?? sc.sealBlock)}.` };
    if (def.kind === 'hunt') return { big: 'Found before a customer did.', small: `Evidence sealed in block ${fmtBlock(sc.sealBlock)}.` };
    return { big: `Caught in ${((sc.caughtMs ?? 0) / 1000).toFixed(1)}s. Repaired. Sealed in block ${fmtBlock(sc.sealBlock)}.`, small: inc?.findingId ? `Linked to ${inc.findingId} — the bug that made this possible.` : '' };
  })();

  return (
    <section id="cheat" className="border-t border-line">
      <div className="mx-auto max-w-[1440px] px-5 py-24 md:px-8">
        <Reveal>
          <div className="font-mono text-[15px] font-semibold uppercase tracking-[0.16em] text-accent">Interactive</div>
          <h2 className="font-display mt-2 text-[40px] font-extrabold leading-[1.02] text-ink md:text-[60px]">Try to cheat the system.</h2>
          <p className="mt-4 max-w-2xl text-[20px] text-ink-2">Pick a move. Watch what the attacker sees, what LedgerHound does, and what gets sealed — all at once.</p>
        </Reveal>

        <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {CHEAT_ORDER.map((cid) => {
            const d = SCENARIOS[cid];
            const Icon = ICONS[cid];
            const active = id === cid;
            const legit = d.kind === 'legit';
            return (
              <motion.button
                key={cid}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  run(cid);
                  if (window.innerWidth < 1024) document.getElementById('cheat-lanes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className={`group flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition ${
                  active ? (legit ? 'border-ok bg-ok-soft' : 'border-ink bg-ink text-paper') : legit ? 'border-dashed border-line-2 bg-surface hover:border-ok' : 'border-line bg-surface hover:border-ink'
                }`}
              >
                <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${active && !legit ? 'bg-paper/15 text-paper' : legit ? 'bg-ok-soft text-ok' : 'bg-bad-soft text-bad'}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span>
                  {legit && <span className={`block text-[15px] font-semibold ${active ? 'text-ok' : 'text-muted'}`}>Or: do something normal</span>}
                  <span className={`block font-display text-[19px] font-bold leading-tight ${active && !legit ? 'text-paper' : 'text-ink'}`}>{d.label}</span>
                  {!legit && <span className={`mt-0.5 block text-[15px] ${active ? 'text-paper/70' : 'text-muted'}`}>{d.sub}</span>}
                </span>
              </motion.button>
            );
          })}
        </div>

        <div className="relative mt-8 scroll-mt-24" id="cheat-lanes">
          <div className="grid gap-4 lg:grid-cols-3">
            <Lane n={1} title="The attack" tone={def ? (def.kind === 'legit' ? 'ok' : 'bad') : 'muted'} caption={lane1Caption}>
              <AnimatePresence mode="wait">
                <motion.div key={(id ?? 'none') + (sc?.runId ?? 0)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  {lane1}
                </motion.div>
              </AnimatePresence>
            </Lane>
            <Lane n={2} title={def?.kind === 'hunt' ? 'Found & proven' : 'Caught & fixed'} tone={tone2} caption={cap2}>
              {lane2}
            </Lane>
            <Lane n={3} title="Sealed on the blockchain" tone={tone3} caption={cap3}>
              {def?.kind === 'hunt' && stepIdx < 4 ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-[17px] text-ink-2">
                    <Fingerprint className="size-5 text-seal" /> Every request the agent sends is logged and chained.
                  </div>
                  <BlockStrip simple count={4} />
                </div>
              ) : (
                lane3
              )}
            </Lane>
          </div>

          <AnimatePresence>
            {endText && def && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                className="mt-5 flex flex-col items-start justify-between gap-5 rounded-2xl bg-ink p-6 text-paper md:flex-row md:items-center md:p-8"
              >
                <div className="flex items-center gap-4">
                  <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${def.kind === 'legit' ? 'bg-ok' : 'bg-seal'}`}>
                    {def.kind === 'legit' ? <Smile className="size-7" /> : <Lock className="size-7" />}
                  </span>
                  <div>
                    <div className="font-display text-[26px] font-bold leading-tight md:text-[32px]">{endText.big}</div>
                    {endText.small && <div className="mt-1 text-[17px] text-paper/70">{endText.small}</div>}
                  </div>
                </div>
                <button
                  onClick={() => useSim.setState({ mode: 'tech', section: def.techSection })}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full bg-paper px-5 py-3 text-[17px] font-semibold text-ink transition hover:bg-accent hover:text-white"
                >
                  See exactly how <ArrowRight className="size-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

function Placeholder({ text }: { text: string }) {
  return (
    <div className="grid h-full min-h-[200px] place-items-center rounded-xl border-2 border-dashed border-line text-center text-[17px] text-muted">
      <span className="px-6">{text}</span>
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useSim } from '../sim/store';
import { EDITABLE, TABLE_COLUMNS, type Row } from '../sim/seed';
import { fmtINR } from './ui';

const TABLES: Row['table'][] = ['bookings', 'refunds', 'users'];

function Cell({ row, field, editable, tone }: { row: Row; field: string; editable: boolean; tone: 'ok' | 'warn' | 'bad' }) {
  const value = (row as unknown as Record<string, string | number>)[field];
  const [draft, setDraft] = useState<string | null>(null);
  const editCell = useSim((s) => s.editCell);
  const vault = useSim((s) => s.vault);
  const orig = (vault.find((r) => r.id === row.id) as unknown as Record<string, string | number>)[field];
  const changed = orig !== value;
  const canEdit = editable && EDITABLE[row.table].includes(field);
  const show = field === 'fare' || field === 'amount' ? fmtINR(Number(value)) : String(value);

  if (canEdit && draft !== null) {
    return (
      <input
        autoFocus
        aria-label={`${row.id} ${field}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          editCell(row.id, field, draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            editCell(row.id, field, draft);
            setDraft(null);
          }
          if (e.key === 'Escape') setDraft(null);
        }}
        className="w-full min-w-[80px] rounded-md border-2 border-bad bg-surface px-1.5 py-0.5 font-mono text-[15px] text-ink outline-none"
      />
    );
  }
  return (
    <motion.button
      type="button"
      disabled={!canEdit}
      onClick={() => setDraft(String(value))}
      initial={false}
      animate={{ backgroundColor: changed ? (tone === 'warn' ? 'var(--warn-soft)' : 'var(--bad-soft)') : 'rgba(0,0,0,0)' }}
      className={`w-full whitespace-nowrap rounded-md px-1.5 py-0.5 text-left font-mono text-[15px] tabular ${changed ? (tone === 'warn' ? 'font-semibold text-warn' : 'font-semibold text-bad') : 'text-ink-2'} ${canEdit ? 'cursor-text hover:outline hover:outline-1 hover:outline-bad/50' : 'cursor-default'}`}
      title={canEdit ? 'Click to edit directly in the database' : undefined}
    >
      {show}
    </motion.button>
  );
}

/** The 16 watched rows. With `editable`, every editable cell becomes a direct-DB edit. */
export function RowTable({ editable = false, compact = false }: { editable?: boolean; compact?: boolean }) {
  const rows = useSim((s) => s.rows);
  const pending = useSim((s) => s.pendingAnchor);
  const incident = useSim((s) => s.incident);
  const tampered = incident && incident.kind === 'tamper' && incident.status === 'detected' ? incident.rowIds : [];
  return (
    <div className="grid gap-4 2xl:grid-cols-2">
      {TABLES.map((t) => (
        <div key={t} className={`min-w-0 overflow-x-auto rounded-xl border border-line scrollbar-thin ${t === 'bookings' ? '2xl:col-span-2' : ''}`}>
          <div className="border-b border-line bg-surface-2 px-3 py-2 font-mono text-[14px] font-semibold text-muted">{t}</div>
          <table className="w-full text-left">
            <tbody>
              {rows
                .filter((r) => r.table === t)
                .map((r) => {
                  const state = tampered.includes(r.id) ? 'bad' : pending.includes(r.id) ? 'warn' : 'ok';
                  return (
                    <tr key={r.id} className="border-b border-line last:border-0">
                      <td className="whitespace-nowrap px-2 py-1">
                        <span className="flex items-center gap-2 font-mono text-[15px] font-semibold text-ink">
                          <span className={`size-2 shrink-0 rounded-full ${state === 'bad' ? 'bg-bad' : state === 'warn' ? 'bg-warn' : 'bg-ok'}`} />
                          {r.id}
                        </span>
                      </td>
                      {TABLE_COLUMNS[t]
                        .filter((c) => !compact || c !== 'agency')
                        .map((c) => (
                          <td key={c} className="whitespace-nowrap px-1 py-1">
                            <Cell row={r} field={c} editable={editable} tone={state} />
                          </td>
                        ))}
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

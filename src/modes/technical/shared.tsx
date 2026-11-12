import type { ReactNode } from 'react';
import { PlainWords } from '../../components/ui';

export function Section({ n, title, lead, plain, children, aside }: { n: number; title: string; lead?: ReactNode; plain: ReactNode; children: ReactNode; aside?: ReactNode }) {
  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="font-mono text-[14px] font-semibold uppercase tracking-[0.16em] text-accent">T{n}</div>
          <h1 className="font-display mt-1 text-[32px] font-extrabold leading-[1.05] text-ink md:text-[42px]">{title}</h1>
          {lead && <p className="mt-3 max-w-3xl text-[17px] leading-relaxed text-ink-2">{lead}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-6">
        <PlainWords>{plain}</PlainWords>
      </div>
      <div className="mt-8 space-y-6">{children}</div>
    </section>
  );
}

export function Panel({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 rounded-2xl border border-line bg-surface shadow-card ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <h3 className="font-display text-[19px] font-bold text-ink">{title}</h3>
          {right}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 text-[15px] font-semibold text-ink">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${checked ? 'bg-ink' : 'bg-line-2'}`}
      >
        <span className={`absolute top-1 size-5 rounded-full bg-paper shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
      </button>
      {label}
    </label>
  );
}

export const METHOD_COLOR: Record<string, string> = {
  GET: 'text-ok',
  POST: 'text-accent',
  PATCH: 'text-warn',
  PUT: 'text-warn',
  DELETE: 'text-bad',
};

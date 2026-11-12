import { useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Copy, Lightbulb } from 'lucide-react';
import { short } from '../sim/crypto';

/** Monospace hash, truncated `9f3a…c21e`, click to copy the full value. */
export function Hash({ value, n = 4, className = '', title }: { value: string; n?: number; className?: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return <span className="font-mono text-muted">—</span>;
  return (
    <button
      type="button"
      title={title ?? `${value}\nClick to copy`}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={`group inline-flex items-center gap-1 rounded-md font-mono tabular hover:text-accent ${className}`}
    >
      <span>{short(value, n)}</span>
      {copied ? <Check className="size-3.5 text-ok" aria-label="copied" /> : <Copy className="size-3.5 opacity-0 transition group-hover:opacity-60" aria-hidden />}
    </button>
  );
}

/** "In plain words" callout required on every technical section. */
export function PlainWords({ children }: { children: ReactNode }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-line bg-surface-2 p-5">
      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-warn-soft text-warn">
        <Lightbulb className="size-[18px]" aria-hidden />
      </div>
      <div>
        <div className="font-display text-[15px] font-semibold uppercase tracking-wide text-muted">In plain words</div>
        <p className="mt-1 text-[17px] leading-relaxed text-ink-2">{children}</p>
      </div>
    </div>
  );
}

/** Inline jargon term with a hover/focus explanation. */
export function Term({ children, tip }: { children: ReactNode; tip: string }) {
  return (
    <span className="group relative inline-block">
      <span tabIndex={0} className="cursor-help border-b-2 border-dotted border-accent/50 outline-none">
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-[min(16rem,80vw)] -translate-x-1/2 rounded-xl bg-ink px-3.5 py-2.5 text-[15px] font-normal leading-snug text-paper invisible opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {tip}
      </span>
    </span>
  );
}

export function Reveal({ children, delay = 0, className = '', y = 24 }: { children: ReactNode; delay?: number; className?: string; y?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: reduce ? 0.2 : 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface shadow-card ${className}`}>{children}</div>;
}

export function SectionHead({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="font-mono text-[14px] font-medium uppercase tracking-[0.14em] text-accent">{kicker}</div>
      <h2 className="font-display mt-1.5 text-[34px] font-bold leading-[1.05] text-ink md:text-[40px]">{title}</h2>
      {children && <p className="mt-3 max-w-3xl text-[17px] text-ink-2">{children}</p>}
    </div>
  );
}

type BtnVariant = 'primary' | 'ghost' | 'danger' | 'soft';
export function Button({
  children,
  onClick,
  variant = 'ghost',
  className = '',
  disabled,
  title,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
  title?: string;
  type?: 'button' | 'submit';
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-ink text-paper hover:bg-accent',
    ghost: 'border border-line-2 bg-surface text-ink hover:border-ink',
    danger: 'bg-bad text-white hover:brightness-110',
    soft: 'bg-accent-soft text-accent hover:bg-accent hover:text-white',
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-[15px] font-semibold transition active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 ${v[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export const STATE_TEXT = {
  ok: 'text-ok',
  bad: 'text-bad',
  warn: 'text-warn',
  seal: 'text-seal',
};

export function Badge({ tone, children }: { tone: 'ok' | 'bad' | 'warn' | 'seal' | 'muted'; children: ReactNode }) {
  const map = {
    ok: 'bg-ok-soft text-ok',
    bad: 'bg-bad-soft text-bad',
    warn: 'bg-warn-soft text-warn',
    seal: 'bg-seal-soft text-seal',
    muted: 'bg-surface-2 text-muted border border-line',
  } as const;
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[14px] font-semibold ${map[tone]}`}>{children}</span>;
}

export const fmtINR = (n: number) => '₹' + n.toLocaleString('en-IN');
export const fmtBlock = (n?: number) => (n ? '#' + n.toLocaleString('en-US') : '—');

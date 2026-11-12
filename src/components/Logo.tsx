/** Geometric hound-in-shield mark: a shield cut by an "L" ledger stroke, ear notch on top. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 2.5 27.5 6.5v9.2c0 7-4.9 11.8-11.5 13.8C9.4 27.5 4.5 22.7 4.5 15.7V6.5Z" fill="var(--ink)" />
      <path d="M11 9.5h3.6v9.6h7.2v3.4H11Z" fill="var(--paper)" />
      <path d="m18.2 9.5 4.6 3.4-4.6 3.4Z" fill="var(--accent)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-[21px] font-bold tracking-tight text-ink">
        Ledger<span className="text-accent">Hound</span>
      </span>
    </span>
  );
}

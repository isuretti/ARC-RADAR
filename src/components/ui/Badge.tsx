import { type ReactNode } from 'react';
import { clsx } from 'clsx';

type BadgeVariant = 'verified' | 'warning' | 'unknown' | 'buy' | 'sell' | 'neutral' | 'accent';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  verified: 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30',
  warning: 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30',
  unknown: 'bg-[var(--subtle)]/10 text-[var(--subtle)] border border-[var(--subtle)]/20',
  buy: 'bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/30',
  sell: 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30',
  neutral: 'bg-[var(--surface-muted)] text-[var(--muted)] border border-[var(--border)]',
  accent: 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25',
};

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold tracking-wide uppercase',
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}

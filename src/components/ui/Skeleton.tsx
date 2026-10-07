import { type CSSProperties } from 'react';
import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'rounded-md bg-[var(--surface-strong)] animate-pulse',
        className,
      )}
      style={style}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-full" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
        <Skeleton className="h-9 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-b border-[var(--border)]">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-3.5" style={{ width: `${40 + i * 10}%` }} />
        </td>
      ))}
    </tr>
  );
}

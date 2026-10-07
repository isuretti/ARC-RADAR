import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-[var(--surface-muted)] flex items-center justify-center">
        <Icon size={22} className="text-[var(--subtle)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--ink-2)]">{title}</p>
        {description && (
          <p className="text-xs text-[var(--subtle)] mt-1 max-w-xs">{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
      <p className="text-sm font-semibold text-[var(--danger)]">Failed to load data</p>
      <p className="text-xs text-[var(--subtle)] max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs font-semibold text-[var(--accent)] hover:underline"
        >
          Try again
        </button>
      )}
    </div>
  );
}

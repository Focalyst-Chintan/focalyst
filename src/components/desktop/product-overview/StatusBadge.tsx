export type StatusBadgeVariant = 'available' | 'development' | 'planned';

interface StatusBadgeProps {
  variant?: StatusBadgeVariant;
  label?: string;
  className?: string;
}

const DEFAULT_LABELS: Record<StatusBadgeVariant, string> = {
  available: 'Available now',
  development: 'In development',
  planned: 'Planned · 2026',
};

export function StatusBadge({
  variant = 'available',
  label,
  className = '',
}: StatusBadgeProps) {
  const text = label ?? DEFAULT_LABELS[variant];
  const isAvailable = variant === 'available';

  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium leading-none ${
        isAvailable
          ? 'bg-primary-soft text-primary-text'
          : 'border border-line bg-surface-2 text-ink-2'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-full ${
          isAvailable ? 'bg-primary-text' : 'bg-ink-3'
        }`}
      />
      {text}
    </span>
  );
}

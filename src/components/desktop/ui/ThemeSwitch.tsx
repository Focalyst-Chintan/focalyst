'use client';
import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeSwitch({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTheme = mounted ? theme || 'system' : 'system';

  const modes: Array<{ value: 'light' | 'dark' | 'system'; label: string; icon: typeof Sun }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div
      role="group"
      aria-label="Theme selection"
      className={`inline-flex items-center bg-surface-2 p-1 rounded-full border border-line ${className}`}
    >
      {modes.map((mode) => {
        const Icon = mode.icon;
        const isActive = currentTheme === mode.value;

        return (
          <button
            key={mode.value}
            type="button"
            title={mode.label}
            aria-label={mode.label}
            aria-pressed={isActive}
            onClick={() => setTheme(mode.value)}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition-all duration-150 cursor-pointer focus-visible:outline-none focus-visible:shadow-[0_0_0_2px_var(--canvas),0_0_0_4px_var(--ring)] ${
              isActive
                ? 'bg-surface shadow-[var(--shadow-1)] text-ink'
                : 'text-ink-3 hover:text-ink'
            }`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        );
      })}
    </div>
  );
}

export default ThemeSwitch;

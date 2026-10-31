'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MSwitch } from '@/components/mobile/ui';

export default function DarkModeToggle() {
    const [mounted, setMounted] = useState(false);
    const { theme, setTheme, resolvedTheme } = useTheme();
    const { t } = useTranslation();

    // After mounting, we have access to the theme state
    useEffect(() => {
        setMounted(true);
    }, []);

    const isDark = mounted && (theme === 'dark' || resolvedTheme === 'dark');

    const handleToggle = () => {
        setTheme(isDark ? 'light' : 'dark');
    };

    return (
        <div className="flex items-center justify-between gap-3 min-h-14 px-4 border-t border-line">
            <div className="flex items-center gap-3">
                <span className="m-tile !w-9 !h-9 text-ink-2">
                    <Moon size={18} strokeWidth={1.75} aria-hidden />
                </span>
                <span className="m-callout text-ink">{t('settings.dark')}</span>
            </div>
            <MSwitch checked={isDark} onClick={handleToggle} disabled={!mounted} label="Toggle Dark Mode" />
        </div>
    );
}

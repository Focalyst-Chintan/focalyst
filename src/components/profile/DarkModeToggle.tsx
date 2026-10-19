'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Moon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
        <div className="flex items-center justify-between p-4 border-t border-card-bg/30">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center transition-colors">
                    <Moon size={20} className="text-purple-600 dark:text-purple-400 transition-colors" />
                </div>
                <span className="text-navy-darker dark:text-slate-100 text-[14px] font-medium">{t('settings.dark')}</span>
            </div>
            {/* Custom Premium Toggle Switch */}
            <button
                onClick={handleToggle}
                disabled={!mounted}
                className={`w-12 h-6 rounded-full transition-all duration-300 relative cursor-pointer focus:outline-none ${
                    !mounted 
                        ? 'bg-card-bg opacity-50' 
                        : isDark 
                            ? 'bg-accent' 
                            : 'bg-card-bg'
                }`}
                aria-label="Toggle Dark Mode"
            >
                <div 
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-sm ${
                        isDark ? 'left-7' : 'left-1'
                    }`} 
                />
            </button>
        </div>
    );
}

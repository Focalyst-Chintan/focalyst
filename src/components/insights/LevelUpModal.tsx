'use client'

import { useEffect, useState } from 'react'
import { type LevelBenchmark } from '@/lib/utils/levels'

const CONFETTI_COLORS = ['#2DD4BF', '#38BDF8', '#A855F7', '#FACC15', '#FB923C', '#EF4444', '#34D399', '#F59E0B', '#ffffff']

function ConfettiParticles() {
    const particles = Array.from({ length: 40 }, (_, i) => {
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
        const left = Math.random() * 100
        const size = 4 + Math.random() * 8
        const duration = 2 + Math.random() * 2
        const delay = Math.random() * 1.5
        const rotation = Math.random() * 360

        return (
            <div
                key={i}
                className="confetti-particle"
                style={{
                    left: `${left}%`,
                    width: `${size}px`,
                    height: `${size * (0.4 + Math.random() * 0.6)}px`,
                    backgroundColor: color,
                    '--fall-duration': `${duration}s`,
                    '--fall-delay': `${delay}s`,
                    transform: `rotate(${rotation}deg)`,
                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                } as React.CSSProperties}
            />
        )
    })

    return <div className="absolute inset-0 overflow-hidden pointer-events-none">{particles}</div>
}

export function LevelUpModal({
    level,
    onClose
}: {
    level: LevelBenchmark
    onClose: () => void
}) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const t = setTimeout(() => setIsVisible(true), 50)
        return () => clearTimeout(t)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 300)
    }

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
        >
            <ConfettiParticles />

            <div
                className={`relative w-full max-w-sm bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-[#222A41] rounded-3xl p-6 shadow-2xl text-center transform transition-transform duration-300 ${
                    isVisible ? 'scale-100' : 'scale-95'
                }`}
            >
                {/* Level Up Badge */}
                <div
                    className="w-20 h-20 rounded-3xl mx-auto flex flex-col items-center justify-center shadow-lg mb-4 text-white"
                    style={{
                        background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B2B 100%)',
                    }}
                >
                    <span className="text-xs font-bold uppercase tracking-wider opacity-90">Level</span>
                    <span className="text-3xl font-black leading-none">{level.level}</span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">
                    Level Up!
                </h3>
                <p className="text-sm font-bold text-[#FF6B00] mb-3">
                    {level.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Congratulations! You have reached Level {level.level} in Focalyst. Keep up your momentum!
                </p>

                <button
                    onClick={handleClose}
                    className="w-full h-11 bg-[#FF6B00] hover:bg-[#FF751F] text-white font-bold rounded-2xl shadow-md transition-all active:scale-95"
                >
                    Awesome!
                </button>
            </div>
        </div>
    )
}

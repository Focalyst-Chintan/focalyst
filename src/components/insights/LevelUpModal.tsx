'use client'

import { useEffect, useState } from 'react'
import { type LevelDefinition } from '@/lib/utils/levels'

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
    level: LevelDefinition
    onClose: () => void
}) {
    const [isVisible, setIsVisible] = useState(false)
    const nextLevelNames: Record<number, string> = {
        1: 'Momentum', 2: 'Builder', 3: 'Practitioner', 4: 'Disciplined',
        5: 'Focused', 6: 'Flow', 7: 'Operator', 8: 'Achiever',
        9: 'Strategist', 10: 'Mastery', 11: 'Elite', 12: 'Apex',
        13: 'Legend', 14: 'Limitless', 15: ''
    }

    useEffect(() => {
        // Small delay to ensure animation plays
        const t = setTimeout(() => setIsVisible(true), 50)
        return () => clearTimeout(t)
    }, [])

    const handleClose = () => {
        setIsVisible(false)
        setTimeout(onClose, 250)
    }

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center px-6 backdrop-fade-in`}
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
            onClick={handleClose}
        >
            <ConfettiParticles />

            <div
                className={`relative z-10 w-full max-w-[340px] rounded-3xl px-8 pt-10 pb-8 text-center ${isVisible ? 'modal-scale-in' : 'opacity-0'}`}
                style={{
                    background: 'linear-gradient(180deg, #1E293B 0%, #0F172A 100%)',
                    boxShadow: `0 0 40px ${level.color}30, 0 20px 60px rgba(0,0,0,0.5)`
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* LEVEL UP Title */}
                <h2
                    className="text-[32px] font-black text-white mb-6 tracking-tight"
                    style={{ textShadow: `0 0 20px ${level.color}60` }}
                >
                    LEVEL UP!
                </h2>

                {/* Hexagonal Badge */}
                <div className="flex justify-center mb-6">
                    <div
                        className="glow-ring"
                        style={{ '--level-color': level.color } as React.CSSProperties}
                    >
                        <svg width="140" height="140" viewBox="0 0 140 140" fill="none">
                            {/* Outer glow hexagon */}
                            <polygon
                                points="70,5 125,35 125,95 70,125 15,95 15,35"
                                fill="none"
                                stroke={level.color}
                                strokeWidth="2"
                                opacity="0.3"
                            />
                            {/* Main hexagon */}
                            <polygon
                                points="70,12 118,38 118,92 70,118 22,92 22,38"
                                fill={`${level.color}20`}
                                stroke={level.color}
                                strokeWidth="2.5"
                            />
                            {/* Inner gradient fill */}
                            <defs>
                                <linearGradient id="hexGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={level.color} stopOpacity="0.4" />
                                    <stop offset="100%" stopColor={level.color} stopOpacity="0.15" />
                                </linearGradient>
                            </defs>
                            <polygon
                                points="70,20 112,42 112,88 70,110 28,88 28,42"
                                fill="url(#hexGrad)"
                            />
                            {/* Gear icon */}
                            <circle cx="70" cy="62" r="14" fill="none" stroke="white" strokeWidth="2" opacity="0.6" />
                            <circle cx="70" cy="62" r="5" fill="white" opacity="0.6" />
                            {/* Gear teeth */}
                            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                                const rad = (angle * Math.PI) / 180
                                const x1 = 70 + 14 * Math.cos(rad)
                                const y1 = 62 + 14 * Math.sin(rad)
                                const x2 = 70 + 18 * Math.cos(rad)
                                const y2 = 62 + 18 * Math.sin(rad)
                                return (
                                    <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="white" strokeWidth="2.5" opacity="0.5" strokeLinecap="round" />
                                )
                            })}
                            {/* Level number */}
                            <text x="70" y="67" textAnchor="middle" fill="white" fontSize="20" fontWeight="900" fontFamily="Inter, system-ui, sans-serif">
                                {level.level}
                            </text>
                            {/* Level name */}
                            <text x="70" y="102" textAnchor="middle" fill="white" fontSize="13" fontWeight="800" fontFamily="Inter, system-ui, sans-serif" letterSpacing="0.1em">
                                {level.name.toUpperCase()}
                            </text>
                        </svg>
                    </div>
                </div>

                {/* Congratulatory text */}
                <p className="text-[18px] font-bold text-white mb-1.5">
                    You are now a {level.name}
                </p>
                {nextLevelNames[level.level] && (
                    <p className="text-[14px] text-white/60 mb-8 leading-relaxed">
                        Keep the momentum going to reach {nextLevelNames[level.level]}.
                    </p>
                )}
                {!nextLevelNames[level.level] && (
                    <p className="text-[14px] text-white/60 mb-8 leading-relaxed">
                        You&apos;ve reached the pinnacle. Truly Limitless.
                    </p>
                )}

                {/* CTA Button */}
                <button
                    id="level-up-dismiss"
                    onClick={handleClose}
                    className="w-full py-3.5 rounded-2xl text-[16px] font-bold text-white transition-all duration-200 active:scale-95"
                    style={{
                        background: level.gradient,
                        boxShadow: `0 4px 16px ${level.color}40`
                    }}
                >
                    Awesome!
                </button>
            </div>
        </div>
    )
}

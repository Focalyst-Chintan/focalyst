'use client'

import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface DailyData {
    day: string;
    focus: number;
    break: number;
    date: Date;
}

export function FocusActivityCard({ data, isPaid }: { data: DailyData[], isPaid: boolean }) {
    const [view, setView] = useState<'weekly' | 'monthly'>('weekly')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm w-full">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-[18px] font-semibold text-navy">Focus Activity</h3>
                <div className="flex bg-page-bg rounded-lg p-1">
                    <button
                        onClick={() => setView('weekly')}
                        className={`text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors ${view === 'weekly' ? 'bg-navy text-white shadow-sm' : 'text-blue-muted hover:text-navy'}`}
                    >
                        Weekly
                    </button>
                    <button
                        onClick={() => {
                            if (isPaid) setView('monthly')
                        }}
                        className={`text-[12px] px-3 py-1.5 rounded-md font-medium transition-colors relative ${view === 'monthly' ? 'bg-navy text-white shadow-sm' : 'text-blue-muted hover:text-navy'} ${!isPaid ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Monthly
                        {!isPaid && (
                            <div className="absolute -top-1 -right-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FF751F" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                            </div>
                        )}
                    </button>
                </div>
            </div>

            <div className="h-48 w-full mt-4">
                {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barSize={24}>
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#95A7B5', fontSize: 11, fontWeight: 500 }}
                                dy={10}
                            />
                            <Tooltip
                                cursor={{ fill: '#F4F7FA', radius: 4 }}
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(74,108,140,0.1)', fontSize: '12px' }}
                                formatter={(value: any, name: any) => [`${value}h`, name === 'focus' ? 'Focus' : 'Break']}
                            />
                            <Bar dataKey="focus" stackId="a" fill="#4A6C8C" radius={[0, 0, 4, 4]} />
                            <Bar dataKey="break" stackId="a" fill="#FF751F" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="flex justify-center items-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-navy"></div>
                    <span className="text-[11px] font-medium text-blue-muted">Focus</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent"></div>
                    <span className="text-[11px] font-medium text-blue-muted">Break</span>
                </div>
            </div>
        </div>
    )
}

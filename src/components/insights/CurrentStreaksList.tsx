interface StreakHabit {
    id: string;
    name: string;
    icon: string;
    current_streak: number;
}

export function CurrentStreaksList({ habits }: { habits: StreakHabit[] }) {
    if (habits.length === 0) {
        return (
            <div className="mt-8">
                <h3 className="text-[18px] font-semibold text-navy mb-4">Current Streaks</h3>
                <div className="bg-white rounded-3xl p-6 shadow-sm text-center">
                    <p className="text-[14px] text-blue-muted">No active habits. Create one to start a streak!</p>
                </div>
            </div>
        )
    }

    return (
        <div className="mt-8">
            <h3 className="text-[18px] font-semibold text-navy mb-4">Current Streaks</h3>

            <div className="grid grid-cols-2 gap-4">
                {habits.slice(0, 4).map((habit) => (
                    <div key={habit.id} className="bg-white rounded-3xl p-5 shadow-sm flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-[24px] mb-3">
                            {habit.icon}
                        </div>
                        <h4 className="text-[15px] font-semibold text-navy leading-tight">{habit.name}</h4>
                        <p className="text-[12px] text-blue-muted mt-1">{habit.current_streak} days in a row</p>
                    </div>
                ))}
            </div>
        </div>
    )
}

import { PomodoroSession } from '@/types'

export function getStartAndEndOfWeek(date: Date) {
    const currentDay = date.getDay()
    const startOfWeek = new Date(date)
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay
    startOfWeek.setDate(date.getDate() + diffToMonday)
    startOfWeek.setHours(0, 0, 0, 0)

    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    return { startOfWeek, endOfWeek }
}

export function calculateTrend(currentValue: number, previousValue: number) {
    if (previousValue === 0) {
        return currentValue > 0 ? 100 : 0
    }
    return Math.round(((currentValue - previousValue) / previousValue) * 100)
}

export function aggregateSessionsByDay(activities: any[], startOfWeek: Date, endOfWeek: Date) {
    const dailyData = [
        { day: 'Mon', focus: 0, break: 0, date: new Date(startOfWeek) },
        { day: 'Tue', focus: 0, break: 0, date: new Date(startOfWeek.getTime() + 1 * 24 * 60 * 60 * 1000) },
        { day: 'Wed', focus: 0, break: 0, date: new Date(startOfWeek.getTime() + 2 * 24 * 60 * 60 * 1000) },
        { day: 'Thu', focus: 0, break: 0, date: new Date(startOfWeek.getTime() + 3 * 24 * 60 * 60 * 1000) },
        { day: 'Fri', focus: 0, break: 0, date: new Date(startOfWeek.getTime() + 4 * 24 * 60 * 60 * 1000) },
        { day: 'Sat', focus: 0, break: 0, date: new Date(startOfWeek.getTime() + 5 * 24 * 60 * 60 * 1000) },
        { day: 'Sun', focus: 0, break: 0, date: new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000) },
    ]

    activities.forEach(activity => {
        // Parse date string securely, ignoring time zone offsets if it's YYYY-MM-DD
        const [year, month, day] = activity.date.split('-').map(Number)
        const activityDate = new Date(year, month - 1, day)

        let dayIndex = activityDate.getDay() - 1 // Mon is 0
        if (dayIndex === -1) dayIndex = 6 // Sun is 6

        dailyData[dayIndex].focus += activity.focus_time_minutes || 0
        dailyData[dayIndex].break += activity.break_time_minutes || 0
    })

    // convert to exact hours for chart readability
    return dailyData.map(d => ({
        ...d,
        focus: Number((d.focus / 60).toFixed(2)),
        break: Number((d.break / 60).toFixed(2))
    }))
}

export function calculateProductivityScore(
    tasksCompleted: number,
    tasksTotal: number,
    habitsCurrentStreakSum: number,
    habitsCount: number,
    focusMinutesThisWeek: number,
    focusMinutesLastWeek: number
) {
    // Score = weighted average out of 100
    // Tasks completed on time:    40% weight
    // Habit consistency:          35% weight
    // Focus hours vs avg:         25% weight

    let taskScore = 0
    if (tasksTotal > 0) {
        taskScore = (tasksCompleted / tasksTotal) * 40
    }

    let habitScore = 0
    // Assuming a good streak is 7 days
    if (habitsCount > 0) {
        const avgStreak = habitsCurrentStreakSum / habitsCount
        habitScore = Math.min((avgStreak / 7) * 35, 35) // cap at 35
    }

    let focusScore = 0
    if (focusMinutesLastWeek > 0) {
        focusScore = Math.min((focusMinutesThisWeek / focusMinutesLastWeek) * 25, 25)
    } else if (focusMinutesThisWeek > 0) {
        focusScore = 25 // max score if they did something and nothing last week
    }

    return Math.round(taskScore + habitScore + focusScore)
}

import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function TodayLoading() {
  return (
    <div className="w-full flex flex-col gap-7 animate-pulse">
      {/* Header Row Skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-11 w-72 rounded-[14px]" />
          <Skeleton className="h-4 w-44 rounded-[8px]" />
        </div>
        <Skeleton className="h-10 w-32 rounded-[12px]" />
      </div>

      {/* Countdown Cards Banner Skeleton (min-h-[120px]) */}
      <div className="hidden lg:flex flex-col gap-3 w-full">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded-[6px]" />
          <Skeleton className="h-7 w-28 rounded-[8px]" />
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          <Skeleton className="min-h-[120px] rounded-[20px]" />
          <Skeleton className="min-h-[120px] rounded-[20px]" />
          <Skeleton className="min-h-[120px] rounded-[20px]" />
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-12 gap-5">
        {/* Row 1 */}
        {/* Card 1: Focus Hero */}
        <Skeleton className="lg:col-span-2 xl:col-span-5 min-h-[240px] rounded-[20px]" />

        {/* Card 2: Habits */}
        <Skeleton className="lg:col-span-1 xl:col-span-4 min-h-[240px] rounded-[20px]" />

        {/* Card 3: Up Next */}
        <Skeleton className="lg:col-span-1 xl:col-span-3 min-h-[240px] rounded-[20px]" />

        {/* Row 2 */}
        {/* Card 4: Focus this week (Chart reserved height 220px, card min-h-[320px]) */}
        <div className="lg:col-span-2 xl:col-span-8 min-h-[320px] rounded-[20px] p-6 bg-surface-2/40 border border-line flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48 rounded-[8px]" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <Skeleton className="h-[220px] w-full rounded-[14px]" />
        </div>

        {/* Card 5: Tasks */}
        <Skeleton className="lg:col-span-1 xl:col-span-4 min-h-[320px] rounded-[20px]" />

        {/* Row 3 */}
        {/* Card 6: Habit consistency */}
        <Skeleton className="lg:col-span-2 xl:col-span-8 min-h-[260px] rounded-[20px]" />

        {/* Card 7: Groups / Accountability */}
        <Skeleton className="lg:col-span-1 xl:col-span-4 min-h-[280px] rounded-[20px]" />
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function InsightsLoading() {
  return (
    <div className="w-full pb-16 max-w-[1280px] mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <Skeleton className="h-9 w-32 rounded-[10px]" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-36 rounded-[12px]" />
          <Skeleton className="h-9 w-44 rounded-[12px]" />
        </div>
      </div>

      {/* 12-Column Bento Grid */}
      <div className="grid grid-cols-12 gap-5">
        {/* Row 1: 4 KPI Cards */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="col-span-12 sm:col-span-6 lg:col-span-3 frost p-5 rounded-[20px] flex flex-col justify-between h-[150px]">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-20 rounded-[6px]" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-8 w-28 rounded-[8px]" />
              <Skeleton className="h-3 w-24 rounded-[4px]" />
            </div>
            <div className="flex gap-1 h-6 items-end">
              {[1, 2, 3, 4, 5, 6, 7].map((b) => (
                <Skeleton key={b} className="flex-1 rounded-[3px]" style={{ height: `${(b * 13) % 24 + 6}px` }} />
              ))}
            </div>
          </div>
        ))}

        {/* Row 2: Focus Activity (8 cols, chart reserved 280px) and Level Card (4 cols) */}
        <div className="col-span-12 lg:col-span-8 frost p-5 rounded-[20px] flex flex-col justify-between min-h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-32 rounded-[6px]" />
            <Skeleton className="h-4 w-40 rounded-[6px]" />
          </div>
          {/* Reserved Chart height 280px */}
          <div className="h-[280px] w-full rounded-[14px] bg-surface-2/40 border border-line flex items-end p-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7].map((bar) => (
              <div key={bar} className="flex-1 flex gap-1 items-end h-full">
                <Skeleton className="w-1/2 rounded-t-[6px]" style={{ height: `${(bar * 37) % 200 + 40}px` }} />
                <Skeleton className="w-1/2 rounded-t-[6px]" style={{ height: `${(bar * 23) % 160 + 20}px` }} />
              </div>
            ))}
          </div>
        </div>

        {/* Level Card (4 cols) */}
        <div className="col-span-12 lg:col-span-4 frost p-5 rounded-[20px] flex flex-col justify-between min-h-[380px]">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded-[4px]" />
              <Skeleton className="h-7 w-32 rounded-[8px]" />
            </div>
            <Skeleton className="w-12 h-12 rounded-full" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full rounded-[6px]" />
            <Skeleton className="h-3 w-full rounded-full" />
            <Skeleton className="h-4 w-28 rounded-[6px]" />
          </div>
          <Skeleton className="h-10 w-full rounded-[12px]" />
        </div>

        {/* Row 3: Habits Progress (6 cols) & Time of Day (6 cols) */}
        <div className="col-span-12 lg:col-span-6 frost p-5 rounded-[20px] min-h-[260px] space-y-4">
          <Skeleton className="h-5 w-36 rounded-[6px]" />
          <Skeleton className="h-12 w-full rounded-[12px]" />
          <Skeleton className="h-12 w-full rounded-[12px]" />
          <Skeleton className="h-12 w-full rounded-[12px]" />
        </div>

        <div className="col-span-12 lg:col-span-6 frost p-5 rounded-[20px] min-h-[260px] space-y-4">
          <Skeleton className="h-5 w-36 rounded-[6px]" />
          <Skeleton className="h-32 w-full rounded-[14px]" />
          <Skeleton className="h-4 w-48 rounded-[6px]" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function GroupsLoading() {
  return (
    <div className="w-full max-w-[1280px] mx-auto pb-16 animate-pulse">
      {/* Desktop 2-column layout (320px left sidebar, 1fr main leaderboard) */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Left Card: Group Stats */}
        <div className="frost rounded-[24px] p-6 space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded-[10px]" />
            <Skeleton className="h-4 w-28 rounded-[6px]" />
          </div>

          <div className="p-4 rounded-[16px] bg-surface-2/40 space-y-2">
            <Skeleton className="h-3 w-20 rounded-[4px]" />
            <Skeleton className="h-8 w-24 rounded-[8px]" />
            <Skeleton className="h-3 w-32 rounded-[4px]" />
          </div>

          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full rounded-[12px]" />
            <Skeleton className="h-10 w-full rounded-[12px]" />
          </div>
        </div>

        {/* Right Card: Leaderboard with Podium */}
        <div className="frost rounded-[28px] p-8 space-y-8">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <Skeleton className="h-8 w-44 rounded-[10px]" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          {/* Reserved Podium Heights (Top 3): 160px (1st), 120px (2nd), 100px (3rd) + 56px avatars */}
          <div className="flex items-end justify-center gap-4 max-w-[560px] mx-auto pt-4">
            {/* 2nd place (120px) */}
            <div className="flex-1 max-w-[172px] flex flex-col items-center">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-[6px] mt-2" />
              <Skeleton className="h-3 w-14 rounded-[4px] mt-1" />
              <Skeleton className="mt-3 w-full h-[120px] rounded-t-[16px]" />
            </div>

            {/* 1st place (160px) */}
            <div className="flex-1 max-w-[172px] flex flex-col items-center">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-[6px] mt-2" />
              <Skeleton className="h-3 w-16 rounded-[4px] mt-1" />
              <Skeleton className="mt-3 w-full h-[160px] rounded-t-[16px]" />
            </div>

            {/* 3rd place (100px) */}
            <div className="flex-1 max-w-[172px] flex flex-col items-center">
              <Skeleton className="w-14 h-14 rounded-full" />
              <Skeleton className="h-4 w-20 rounded-[6px] mt-2" />
              <Skeleton className="h-3 w-14 rounded-[4px] mt-1" />
              <Skeleton className="mt-3 w-full h-[100px] rounded-t-[16px]" />
            </div>
          </div>

          {/* Leaderboard Table Rows */}
          <div className="space-y-2 pt-4">
            {[4, 5, 6, 7].map((r) => (
              <div key={r} className="h-14 rounded-[14px] bg-surface-2/40 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-6 h-6 rounded-full" />
                  <Skeleton className="w-9 h-9 rounded-full" />
                  <Skeleton className="h-4 w-32 rounded-[6px]" />
                </div>
                <Skeleton className="h-4 w-16 rounded-[6px]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

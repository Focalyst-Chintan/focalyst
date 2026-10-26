import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function PlanLoading() {
  return (
    <div className="w-full flex flex-col gap-6 animate-pulse">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-6">
          <Skeleton className="h-9 w-24 rounded-[10px]" />
          <Skeleton className="h-9 w-64 rounded-[12px]" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-[10px]" />
          <Skeleton className="h-9 w-32 rounded-[10px]" />
        </div>
      </div>

      {/* Main View Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="rounded-[16px] p-5 bg-surface-2/40 border border-line space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-7 w-7 rounded-lg" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4 rounded-[6px]" />
            <Skeleton className="h-3 w-1/2 rounded-[4px]" />
            <div className="flex gap-1.5 pt-2">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <Skeleton key={d} className="h-7 flex-1 rounded-[6px]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

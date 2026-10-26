import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function FocusLoading() {
  return (
    <div className="w-full relative min-h-screen animate-pulse">
      <div className="w-full grid gap-5 grid-cols-1 lg:grid-cols-12">
        {/* Stage (Timer circle: min-h-[640px]) */}
        <div className="lg:col-span-12 xl:col-span-7 xl:row-span-3 frost rounded-[28px] p-7 min-h-[640px] flex flex-col items-center justify-between">
          <div className="w-full flex items-center justify-between">
            <div className="w-10" />
            <Skeleton className="h-9 w-64 rounded-[12px]" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>

          <Skeleton className="h-4 w-32 rounded-[6px]" />

          {/* Reserved Focus Ring timer (280px circle) */}
          <div className="my-auto py-6">
            <Skeleton className="h-[280px] w-[280px] rounded-full" />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-5 mt-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-[72px] w-[72px] rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>

          {/* Task picker bar */}
          <Skeleton className="h-10 w-[340px] rounded-full mt-5" />
        </div>

        {/* Card 1: Today Stats */}
        <div className="lg:col-span-6 xl:col-span-5 frost rounded-[20px] p-6 min-h-[190px] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 rounded-[4px]" />
              <Skeleton className="h-11 w-28 rounded-[10px]" />
              <Skeleton className="h-4 w-20 rounded-[6px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-20 rounded-[6px]" />
              <Skeleton className="h-4 w-14 rounded-[6px]" />
            </div>
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Card 2: Preset Buttons */}
        <div className="lg:col-span-6 xl:col-span-5 frost rounded-[20px] p-6 min-h-[190px] flex flex-col justify-between">
          <Skeleton className="h-3 w-20 rounded-[4px]" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-12 rounded-[12px]" />
            <Skeleton className="h-12 rounded-[12px]" />
            <Skeleton className="h-12 rounded-[12px]" />
          </div>
          <Skeleton className="h-8 w-full rounded-[10px]" />
        </div>

        {/* Card 3: Sounds / App Blocker */}
        <div className="lg:col-span-12 xl:col-span-5 frost rounded-[20px] p-6 min-h-[190px] space-y-4">
          <Skeleton className="h-5 w-32 rounded-[6px]" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
          <Skeleton className="h-10 w-full rounded-[10px]" />
        </div>
      </div>
    </div>
  );
}

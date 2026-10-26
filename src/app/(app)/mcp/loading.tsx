import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function McpLoading() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 animate-pulse">
      <div className="mx-auto max-w-[760px] pt-10 text-center flex flex-col items-center">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>

        <Skeleton className="h-14 w-96 rounded-[16px] mt-4" />
        <Skeleton className="h-6 w-full max-w-[640px] rounded-[8px] mt-4" />
        <Skeleton className="h-6 w-4/5 max-w-[520px] rounded-[8px] mt-2" />

        {/* Form box */}
        <div className="mt-8 w-full max-w-[520px] frost rounded-[20px] p-6 space-y-4">
          <Skeleton className="h-11 w-full rounded-[14px]" />
          <Skeleton className="h-11 w-full rounded-[14px]" />
          <Skeleton className="h-11 w-full rounded-[14px]" />
        </div>
      </div>

      {/* Grid */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="frost rounded-[20px] p-6 space-y-3">
            <Skeleton className="h-10 w-10 rounded-[10px]" />
            <Skeleton className="h-5 w-40 rounded-[8px]" />
            <Skeleton className="h-12 w-full rounded-[8px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

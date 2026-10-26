import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-[1040px] px-6 py-8 animate-pulse">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-8 w-36 rounded-[10px]" />
        <Skeleton className="h-4 w-72 rounded-[6px]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,720px)] items-start gap-6">
        {/* Left Nav */}
        <div className="frost space-y-2 rounded-[20px] p-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-10 w-full rounded-[12px]" />
          ))}
        </div>

        {/* Right Settings Content */}
        <div className="frost rounded-[24px] p-8 space-y-6">
          <div className="flex items-center gap-4 pb-6 border-b border-line">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40 rounded-[8px]" />
              <Skeleton className="h-4 w-48 rounded-[6px]" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-[6px]" />
              <Skeleton className="h-11 w-full rounded-[14px]" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-[6px]" />
              <Skeleton className="h-11 w-full rounded-[14px]" />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Skeleton className="h-10 w-28 rounded-[12px]" />
          </div>
        </div>
      </div>
    </div>
  );
}

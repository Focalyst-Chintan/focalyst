import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function NotesLoading() {
  return (
    <div className="w-full animate-pulse">
      {/* Desktop Layout (3 panes: 220px, 320px, 1fr) */}
      <div className="hidden lg:grid grid-cols-[220px_320px_1fr] gap-4 h-[calc(100vh-112px)]">
        {/* Pane 1 */}
        <div className="frost rounded-[20px] p-3.5 space-y-3">
          <Skeleton className="h-10 w-full rounded-[12px]" />
          <Skeleton className="h-8 w-full rounded-[10px]" />
          <Skeleton className="h-8 w-full rounded-[10px]" />
          <Skeleton className="h-8 w-full rounded-[10px]" />
        </div>
        {/* Pane 2 */}
        <div className="frost rounded-[20px] p-3.5 space-y-3">
          <Skeleton className="h-10 w-full rounded-[12px]" />
          <Skeleton className="h-16 w-full rounded-[14px]" />
          <Skeleton className="h-16 w-full rounded-[14px]" />
          <Skeleton className="h-16 w-full rounded-[14px]" />
        </div>
        {/* Pane 3 */}
        <div className="frost rounded-[28px] p-8 flex flex-col justify-start space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <Skeleton className="h-4 w-40 rounded-[6px]" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-72 rounded-[12px]" />
          <Skeleton className="h-48 w-full rounded-[16px]" />
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-28 rounded-[8px]" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-10 w-full rounded-[12px]" />
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-[16px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

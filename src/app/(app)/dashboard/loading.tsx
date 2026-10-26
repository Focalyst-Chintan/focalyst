import { Skeleton } from '@/components/desktop/ui/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Skeleton className="w-12 h-12 rounded-full" />
    </div>
  );
}

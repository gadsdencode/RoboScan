import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 pt-24 pb-12">
        <div className="mb-8 space-y-3">
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-5 w-full max-w-lg" />
        </div>

        <div className="grid grid-cols-1 gap-6 mb-8 lg:grid-cols-3">
          <Skeleton className="h-[220px] w-full rounded-xl lg:col-span-2" />
          <Skeleton className="h-[220px] w-full rounded-xl" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

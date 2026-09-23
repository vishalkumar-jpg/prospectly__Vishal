import { Skeleton } from "@/components/ui/skeleton";

export function PublicRequestLoading() {
  return (
    <div className="min-h-screen bg-secondary">
      <div className="sticky top-0 z-[60] flex h-[60px] items-center border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-8">
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="container mx-auto max-w-[1180px] px-4 pt-6 sm:px-7">
        <Skeleton className="mb-6 h-40 w-full rounded-3xl" />
        <Skeleton className="mb-6 h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

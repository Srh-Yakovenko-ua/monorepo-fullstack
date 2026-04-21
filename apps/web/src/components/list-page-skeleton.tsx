import { Skeleton } from "@/components/ui/skeleton";

export function ListPageSkeleton() {
  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <div className="flex justify-end pt-5">
        <Skeleton className="h-7 w-28 rounded-md" />
      </div>
      <section className="mt-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, skeletonIndex) => (
            <div
              className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm"
              key={`skeleton-${skeletonIndex}`}
            >
              <Skeleton className="h-36 rounded-none" />
              <div className="flex flex-col gap-2 p-5">
                <Skeleton className="h-4 w-3/4 rounded-sm" />
                <Skeleton className="h-3 w-full rounded-sm" />
                <Skeleton className="h-3 w-2/3 rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

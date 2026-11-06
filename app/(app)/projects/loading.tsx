import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading projects">
      <Skeleton className="h-9 w-40 rounded-xl" />
      <Skeleton className="mt-3 h-5 w-72 max-w-full rounded-lg" />
      <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

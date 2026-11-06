import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-9 w-72 max-w-full rounded-xl" />
      <Skeleton className="mt-3 h-5 w-96 max-w-full rounded-lg" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-34 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

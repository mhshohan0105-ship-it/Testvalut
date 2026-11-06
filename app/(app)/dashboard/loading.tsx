import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-56 rounded-2xl" />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-34 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

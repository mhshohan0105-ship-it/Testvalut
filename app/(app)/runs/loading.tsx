import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading test runs">
      <Skeleton className="h-9 w-40 rounded-xl" />
      <Skeleton className="mt-3 h-5 w-52 rounded-lg" />
      <Skeleton className="mt-8 h-9 w-40 rounded-lg" />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-34 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

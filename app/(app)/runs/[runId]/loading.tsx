import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading test run">
      <Skeleton className="h-5 w-24 rounded-lg" />
      <Skeleton className="mt-4 h-9 w-72 max-w-full rounded-xl" />
      <Skeleton className="mt-2 h-4 w-56 rounded-lg" />
      <Skeleton className="mt-5 h-44 rounded-2xl" />
      <Skeleton className="mt-4 h-96 rounded-2xl" />
    </div>
  );
}

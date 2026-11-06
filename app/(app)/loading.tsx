import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading page">
      <Skeleton className="h-9 w-56 rounded-xl" />
      <Skeleton className="mt-3 h-5 w-80 max-w-full rounded-lg" />
      <Skeleton className="mt-8 h-72 w-full rounded-2xl" />
    </div>
  );
}

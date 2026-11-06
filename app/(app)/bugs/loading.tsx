import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading bugs">
      <Skeleton className="h-9 w-32 rounded-xl" />
      <Skeleton className="mt-2 h-4 w-52 rounded-lg" />
      <Skeleton className="mt-4 h-9 rounded-xl" />
      <Skeleton className="mt-4 h-[calc(100dvh-16rem)] min-h-96 rounded-2xl" />
    </div>
  );
}

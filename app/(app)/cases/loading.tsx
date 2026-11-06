import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading test cases">
      <Skeleton className="h-9 w-44 rounded-xl" />
      <Skeleton className="mt-2 h-4 w-52 rounded-lg" />
      <div className="mt-4 grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Skeleton className="hidden h-[calc(100dvh-13.5rem)] min-h-96 rounded-2xl lg:block" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-9 rounded-xl" />
          <Skeleton className="h-[calc(100dvh-17rem)] min-h-96 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

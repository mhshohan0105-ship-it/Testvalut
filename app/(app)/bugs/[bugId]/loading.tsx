import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading bug">
      <Skeleton className="h-5 w-20 rounded-lg" />
      <Skeleton className="mt-4 h-5 w-52 rounded-lg" />
      <Skeleton className="mt-2 h-9 w-2/3 rounded-xl" />
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

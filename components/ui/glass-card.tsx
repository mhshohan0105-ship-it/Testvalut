import { cn } from "@/lib/utils";

export function GlassCard({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("glass rounded-2xl", className)} {...props} />;
}

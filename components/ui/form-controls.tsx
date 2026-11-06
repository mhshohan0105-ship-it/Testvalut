import { cn } from "@/lib/utils";

const CONTROL = "w-full rounded-xl border border-input bg-card text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-invalid:border-destructive disabled:opacity-50";

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(CONTROL, "h-10 px-3", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-20 px-3 py-2", className)} {...props} />;
}

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-xs text-destructive">
      {message}
    </p>
  );
}

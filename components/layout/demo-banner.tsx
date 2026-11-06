import { DEMO_MODE } from "@/lib/demo";

export function DemoBanner() {
  if (!DEMO_MODE) return null;
  return (
    <p className="btn-gradient px-4 py-1.5 text-center text-xs font-medium text-white print:hidden">
      This is a live demo. Try anything you like: everything resets daily.
    </p>
  );
}

import { DemoBanner } from "@/components/layout/demo-banner";
import { GlobalShortcuts } from "@/components/layout/global-shortcuts";
import { requireUser } from "@/lib/auth/session";

/** Execution mode drops the sidebar and top bar, so nothing competes with the case. */
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <>
      <DemoBanner />
      {children}
      <GlobalShortcuts />
    </>
  );
}

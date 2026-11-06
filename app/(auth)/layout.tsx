import { LogoMark } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-center px-4 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-2.5">
            <LogoMark />
            <span className="text-lg font-semibold tracking-tight">TestVault</span>
          </div>
          {children}
        </div>
      </div>
      <div className="relative hidden items-center justify-center overflow-hidden lg:flex" aria-hidden>
        <div className="flex max-w-md flex-col items-center text-center">
          <div className="orb-placeholder orb-float size-72" />
          <p className="mt-14 text-3xl font-bold tracking-tight">
            Every test. <span className="text-gradient">One command center.</span>
          </p>
          <p className="mt-3 text-muted-foreground">Write cases, run them from the keyboard, and see exactly where a release stands.</p>
        </div>
      </div>
    </main>
  );
}

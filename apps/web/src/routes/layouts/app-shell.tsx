import { Outlet } from "react-router";

import { ThemePicker } from "@/components/theme-picker";

export function AppShell() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 15% 0%, oklch(0.32 0.12 165 / 0.35), transparent 60%),
            radial-gradient(ellipse 60% 60% at 100% 100%, oklch(0.28 0.1 280 / 0.28), transparent 65%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 100% 80% at 50% 50%, transparent 40%, oklch(0.145 0 0 / 0.4) 100%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-8 pt-10 md:px-16 lg:px-24 2xl:px-32">
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            <div className="size-1.5 rounded-full bg-foreground" />
            <span>monorepo / observability</span>
          </div>
          <ThemePicker />
        </header>

        <Outlet />
      </div>
    </div>
  );
}

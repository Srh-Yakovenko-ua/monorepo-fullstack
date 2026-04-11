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
            radial-gradient(ellipse 80% 55% at 8% 0%, oklch(from var(--primary) l c h / 0.12), transparent 55%),
            radial-gradient(ellipse 55% 65% at 98% 100%, oklch(from var(--info) l c h / 0.08), transparent 60%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 90% at 50% 50%, transparent 35%, var(--background) 85%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 pt-8 md:px-12 lg:px-20 2xl:px-28">
          <div className="flex items-center gap-2.5 font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
            <div className="size-[5px] rounded-full bg-primary opacity-90" />
            <span>monorepo / observability</span>
          </div>
          <ThemePicker />
        </header>

        <Outlet />
      </div>
    </div>
  );
}

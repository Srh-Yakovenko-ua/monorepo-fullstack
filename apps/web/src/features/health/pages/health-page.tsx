import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot, type StatusDotState } from "@/features/health/components/status-dot";
import { useHealth } from "@/features/health/hooks/use-health";
import { formatUptime } from "@/features/health/lib/format";
import { usePageTitle } from "@/hooks/use-page-title";
import { formatTimestamp } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HealthPage() {
  usePageTitle("Health");
  const { data, error, isError, isFetching, isLoading, refetch } = useHealth();

  const visualStatus: StatusDotState = isError ? "down" : (data?.status ?? "loading");

  const headline = isError
    ? "Unreachable"
    : isLoading && !data
      ? "Connecting"
      : visualStatus === "ok"
        ? "Operational"
        : visualStatus === "degraded"
          ? "Degraded"
          : visualStatus === "down"
            ? "Down"
            : "Connecting";

  const description = isError
    ? `The API at localhost:4000 did not respond. ${error.message}.`
    : visualStatus === "ok"
      ? "All systems are responding normally. The Express service is online and accepting requests on port 4000."
      : "Waiting for the first heartbeat from the Express service.";

  return (
    <main className="relative flex flex-1 flex-col px-8 pb-10 md:px-16 md:pb-14 lg:px-24 lg:pb-16 2xl:px-32 2xl:pb-20">
      <section className="mt-20 flex-1 md:mt-28 lg:mt-32">
        <p className="animate-in font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase duration-700 fill-mode-both fade-in slide-in-from-bottom-2">
          System status
        </p>

        <div className="mt-6 flex items-start gap-5 md:gap-7">
          <div className="mt-[0.42em] md:mt-[0.46em]">
            <StatusDot status={visualStatus} />
          </div>
          <h1
            className={cn(
              "animate-in fill-mode-both fade-in slide-in-from-bottom-3",
              "font-display leading-[0.86] font-semibold tracking-[-0.035em]",
              "text-[clamp(3.75rem,9.5vw,16rem)]",
              "delay-100 duration-700",
            )}
          >
            {headline}
            <span className="text-primary">.</span>
          </h1>
        </div>

        <p
          className={cn(
            "animate-in fill-mode-both fade-in slide-in-from-bottom-3",
            "mt-10 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg lg:text-xl",
            "delay-200 duration-700",
          )}
        >
          {description}
        </p>
      </section>

      <section className="mt-20 md:mt-24 lg:mt-28">
        {data ? (
          <div
            className={cn(
              "animate-in fill-mode-both fade-in",
              "grid grid-cols-1 gap-px overflow-hidden border border-border bg-border md:grid-cols-3",
              "delay-300 duration-700",
            )}
          >
            <Metric label="Uptime" value={formatUptime(data.uptimeSeconds)} />
            <Metric label="Last heartbeat" value={formatTimestamp(data.timestamp)} />
            <Metric label="Environment" value="DEVELOPMENT" />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-px md:grid-cols-3">
            <Skeleton className="h-[120px] rounded-none" />
            <Skeleton className="h-[120px] rounded-none" />
            <Skeleton className="h-[120px] rounded-none" />
          </div>
        ) : null}
      </section>

      <footer className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-border pt-8 md:mt-16 md:flex-row md:items-center">
        <Button
          className="h-12 px-6 font-mono text-[11px] tracking-[0.22em] uppercase"
          disabled={isFetching}
          onClick={() => void refetch()}
          variant="outline"
        >
          <RotateCw className={cn("mr-2 size-4", isFetching && "animate-spin")} />
          {isFetching ? "Pinging" : "Ping again"}
        </Button>

        <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
          Express + MongoDB · phase 1
        </p>
      </footer>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="group bg-background p-8 transition-colors hover:bg-muted/40">
      <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 font-mono text-xl text-foreground tabular-nums transition-colors group-hover:text-primary md:text-2xl">
        {value}
      </p>
    </div>
  );
}

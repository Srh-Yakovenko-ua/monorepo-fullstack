import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusDot, type StatusDotState } from "@/features/health/components/status-dot";
import { useHealth } from "@/features/health/hooks/use-health";
import { formatUptime } from "@/features/health/lib/format";
import { ModalId, modalObserver } from "@/features/modals";
import { usePageTitle } from "@/hooks/use-page-title";
import { env } from "@/lib/env";
import { formatTimestamp } from "@/lib/format";
import { createLogger } from "@/lib/logger";
import { cn } from "@/lib/utils";

const logger = createLogger("health-page");

export function HealthPage() {
  usePageTitle("Health");
  const { data, error, isError, isFetching, isLoading, refetch } = useHealth();

  const visualStatus: StatusDotState = isError ? "down" : (data?.status ?? "loading");

  const headline = deriveHeadline(isError, isLoading, !!data, visualStatus);

  const description = isError
    ? `The API at localhost:4000 did not respond. ${error.message}.`
    : visualStatus === "ok"
      ? "All systems are responding normally. The Express service is online and accepting requests on port 4000."
      : "Waiting for the first heartbeat from the Express service.";

  return (
    <main className="relative flex flex-1 flex-col px-6 pb-10 md:px-12 md:pb-14 lg:px-20 lg:pb-16 2xl:px-28 2xl:pb-20">
      <section className="mt-20 flex-1 md:mt-28 lg:mt-32">
        <p className="animate-in font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase duration-700 fill-mode-both fade-in slide-in-from-bottom-2">
          System status
        </p>

        <div className="mt-5 flex items-start gap-4 md:gap-6">
          <div className="mt-[0.44em] md:mt-[0.48em]">
            <StatusDot status={visualStatus} />
          </div>
          <h1
            className={cn(
              "animate-in fill-mode-both fade-in slide-in-from-bottom-3",
              "font-display leading-[0.86] font-semibold",
              "text-[clamp(3.75rem,9.5vw,16rem)]",
              "delay-100 duration-700",
            )}
            style={{ letterSpacing: "-0.038em" }}
          >
            {headline}
            <span className="text-primary">.</span>
          </h1>
        </div>

        <p
          className={cn(
            "animate-in fill-mode-both fade-in slide-in-from-bottom-3",
            "mt-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg",
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
            <Metric label="Environment" value={env.MODE.toUpperCase()} />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-px md:grid-cols-3">
            <Skeleton className="h-[116px] rounded-none" />
            <Skeleton className="h-[116px] rounded-none" />
            <Skeleton className="h-[116px] rounded-none" />
          </div>
        ) : null}
      </section>

      <footer className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-border pt-8 md:mt-16 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-3">
          <Button
            className="h-11 px-5 font-mono text-[10px] tracking-[0.22em] uppercase"
            disabled={isFetching}
            onClick={() => void refetch()}
            variant="outline"
          >
            <RotateCw className={cn("mr-2 size-3.5", isFetching && "animate-spin")} />
            {isFetching ? "Pinging" : "Ping again"}
          </Button>
          <Button
            className="h-11 px-5 font-mono text-[10px] tracking-[0.22em] uppercase"
            onClick={() =>
              modalObserver.addModal(ModalId.Confirm, {
                confirmLabel: "Delete",
                description: "This action cannot be undone.",
                onConfirm: () => {
                  logger.info("confirmed");
                },
                title: "Delete this item?",
                tone: "destructive",
              })
            }
            variant="outline"
          >
            Open confirm modal
          </Button>
        </div>

        <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
          Express + MongoDB · phase 1
        </p>
      </footer>
    </main>
  );
}

function deriveHeadline(
  isError: boolean,
  isLoading: boolean,
  hasData: boolean,
  visualStatus: StatusDotState,
): string {
  if (isError) return "Unreachable";
  if (isLoading && !hasData) return "Connecting";
  if (visualStatus === "ok") return "Operational";
  if (visualStatus === "degraded") return "Degraded";
  if (visualStatus === "down") return "Down";
  return "Connecting";
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="group bg-background px-7 py-6 transition-colors duration-150 hover:bg-accent/60">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-3 font-mono text-xl text-foreground tabular-nums transition-colors duration-150 group-hover:text-primary md:text-2xl">
        {value}
      </p>
    </div>
  );
}

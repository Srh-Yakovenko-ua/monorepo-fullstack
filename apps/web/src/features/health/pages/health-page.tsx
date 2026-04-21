import type { TFunction } from "i18next";

import { RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  usePageTitle("Health");
  const { data, error, isError, isFetching, isLoading, refetch } = useHealth();

  const visualStatus: StatusDotState = isError ? "down" : (data?.status ?? "loading");

  const headline = deriveHeadline(isError, isLoading, !!data, visualStatus, t);

  function handlePingAgain() {
    void refetch();
  }

  function handleOpenConfirmModal() {
    modalObserver.addModal(ModalId.Confirm, {
      confirmLabel: t("health.modal.confirmLabel"),
      description: t("health.modal.description"),
      onConfirm: () => {
        logger.info("confirmed");
      },
      title: t("health.modal.title"),
      tone: "destructive",
    });
  }

  const description = isError
    ? t("health.description.error", { message: error.message })
    : visualStatus === "ok"
      ? t("health.description.ok")
      : t("health.description.connecting");

  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <section className="mt-10 flex-1 md:mt-14 lg:mt-16">
        <p className="animate-in font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase duration-700 fill-mode-both fade-in slide-in-from-bottom-2">
          {t("health.systemStatus")}
        </p>

        <div className="mt-5 flex items-start gap-4 md:gap-6">
          <div className="mt-[0.44em] md:mt-[0.48em]">
            <StatusDot status={visualStatus} />
          </div>
          <h1
            className={cn(
              "animate-in fill-mode-both fade-in slide-in-from-bottom-3",
              "font-display leading-[0.86] font-normal",
              "text-[clamp(3.75rem,9.5vw,14rem)]",
              "delay-100 duration-700",
            )}
            style={{ letterSpacing: "-0.038em" }}
          >
            {headline}
          </h1>
        </div>

        <p
          className={cn(
            "animate-in fill-mode-both fade-in slide-in-from-bottom-3",
            "mt-7 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg",
            "delay-200 duration-700",
          )}
        >
          {description}
        </p>
      </section>

      <section className="mt-12 md:mt-16">
        {data ? (
          <div
            className={cn(
              "animate-in fill-mode-both fade-in",
              "grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border/60 bg-border/30 md:grid-cols-3",
              "shadow-[var(--shadow-card)]",
              "delay-300 duration-700",
            )}
          >
            <Metric label={t("health.metrics.uptime")} value={formatUptime(data.uptimeSeconds)} />
            <Metric
              label={t("health.metrics.lastHeartbeat")}
              value={formatTimestamp(data.timestamp)}
            />
            <Metric label={t("health.metrics.environment")} value={env.MODE.toUpperCase()} />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl md:grid-cols-3">
            <Skeleton className="h-[116px] rounded-none" />
            <Skeleton className="h-[116px] rounded-none" />
            <Skeleton className="h-[116px] rounded-none" />
          </div>
        ) : null}
      </section>

      <footer className="mt-12 flex flex-col items-start justify-between gap-5 border-t border-border/60 pt-8 md:mt-16 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-3">
          <Button
            className="h-11 px-5 font-mono text-[10px] tracking-[0.22em] uppercase transition-all duration-150 hover:ring-4 hover:ring-primary/15"
            disabled={isFetching}
            onClick={handlePingAgain}
            variant="outline"
          >
            <RotateCw className={cn("mr-2 size-3.5", isFetching && "animate-spin")} />
            {isFetching ? t("health.actions.pinging") : t("health.actions.pingAgain")}
          </Button>
          <Button
            className="h-11 px-5 font-mono text-[10px] tracking-[0.22em] uppercase transition-all duration-150 hover:ring-4 hover:ring-primary/15"
            onClick={handleOpenConfirmModal}
            variant="outline"
          >
            {t("health.actions.openConfirmModal")}
          </Button>
        </div>

        <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
          {t("health.footer")}
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
  t: TFunction,
): string {
  if (isError) return t("health.headline.unreachable");
  if (isLoading && !hasData) return t("health.headline.connecting");
  if (visualStatus === "ok") return t("health.headline.operational");
  if (visualStatus === "degraded") return t("health.headline.degraded");
  if (visualStatus === "down") return t("health.headline.down");
  return t("health.headline.connecting");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="group bg-card/80 px-7 py-7 backdrop-blur-sm transition-colors duration-150 hover:bg-accent/40">
      <p className="font-mono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-4 font-mono text-xl text-foreground tabular-nums transition-colors duration-150 group-hover:text-primary md:text-2xl">
        {value}
      </p>
    </div>
  );
}

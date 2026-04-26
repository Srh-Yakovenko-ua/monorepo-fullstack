import type { DeviceViewModel } from "@app/shared";

import { format, formatDistanceToNow, isValid, parseISO } from "date-fns";
import { LogOut, MonitorSmartphone } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useDevices,
  useTerminateDevice,
  useTerminateOtherDevices,
} from "@/features/security/hooks/use-devices";
import { usePageTitle } from "@/hooks/use-page-title";
import { ApiError } from "@/lib/http-client";

const SKELETON_ROW_COUNT = 3;

type DeviceRowProps = {
  device: DeviceViewModel;
  isTerminatePending: boolean;
  onTerminateClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

type TerminateOneDialogState = { deviceId: string; open: true; title: string } | { open: false };

export function DeviceRow({ device, isTerminatePending, onTerminateClick }: DeviceRowProps) {
  const { t } = useTranslation();
  const { absolute: absoluteTime, relative: relativeTime } = formatLastActive(
    device.lastActiveDate,
  );

  return (
    <TableRow className="h-14 animate-in duration-300 fill-mode-both fade-in hover:bg-muted/30">
      <TableCell className="px-4 py-3 text-sm font-medium text-foreground first:pl-6">
        <span className="flex items-center gap-2">
          {device.title}
          {device.isCurrent && (
            <Badge className="bg-primary/10 text-primary" variant="outline">
              {t("devices.currentDevice")}
            </Badge>
          )}
        </span>
      </TableCell>
      <TableCell className="px-4 py-3 font-mono text-sm text-muted-foreground tabular-nums">
        {device.ip}
      </TableCell>
      <TableCell className="px-4 py-3 text-sm text-muted-foreground">
        <span title={absoluteTime}>{relativeTime}</span>
      </TableCell>
      <TableCell className="px-4 py-3 text-right last:pr-6">
        {!device.isCurrent && (
          <Button
            aria-label={t("devices.terminateOne", { title: device.title })}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive focus-visible:ring-destructive/30"
            data-device-id={device.deviceId}
            data-device-title={device.title}
            disabled={isTerminatePending}
            onClick={onTerminateClick}
            size="icon"
            variant="ghost"
          >
            <LogOut />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export function DevicesPage() {
  const { t } = useTranslation();
  usePageTitle(t("devices.title"));

  const { data: devices, error, isError, isLoading, refetch } = useDevices();
  const terminateOtherDevices = useTerminateOtherDevices();
  const terminateDevice = useTerminateDevice();

  const [terminateAllOpen, setTerminateAllOpen] = useState(false);
  const [terminateOneDialog, setTerminateOneDialog] = useState<TerminateOneDialogState>({
    open: false,
  });

  function handleTerminateAllClick() {
    setTerminateAllOpen(true);
  }

  function handleTerminateAllCancel() {
    setTerminateAllOpen(false);
  }

  function handleTerminateAllConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    terminateOtherDevices.mutate(undefined, {
      onSettled: () => setTerminateAllOpen(false),
    });
  }

  function handleTerminateOneClick(e: React.MouseEvent<HTMLButtonElement>) {
    const deviceId = e.currentTarget.dataset.deviceId;
    const deviceTitle = e.currentTarget.dataset.deviceTitle;
    if (!deviceId || !deviceTitle) return;
    setTerminateOneDialog({ deviceId, open: true, title: deviceTitle });
  }

  function handleTerminateOneCancel() {
    setTerminateOneDialog({ open: false });
  }

  function handleTerminateOneConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (!terminateOneDialog.open) return;
    const { deviceId } = terminateOneDialog;
    terminateDevice.mutate(deviceId, {
      onError: (err) => {
        if (err instanceof ApiError && err.status === 403) return;
      },
      onSettled: () => setTerminateOneDialog({ open: false }),
    });
  }

  function handleTerminateOneDialogOpenChange(open: boolean) {
    if (!open) setTerminateOneDialog({ open: false });
  }

  function handleRetryClick() {
    void refetch();
  }

  return (
    <main className="px-5 pt-8 pb-6 md:px-8 md:pb-8 lg:px-12">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="font-display text-2xl font-semibold text-foreground"
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("devices.title")}
          </h1>
          <p className="mt-1 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("devices.description")}
          </p>
        </div>

        <Button
          disabled={terminateOtherDevices.isPending || isLoading || (devices?.length ?? 0) <= 1}
          onClick={handleTerminateAllClick}
          size="sm"
          variant="outline"
        >
          {t("devices.terminateAll")}
        </Button>
      </div>

      {isLoading && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="h-12 px-4 first:pl-6">{t("devices.columns.name")}</TableHead>
                <TableHead className="h-12 px-4">{t("devices.columns.ip")}</TableHead>
                <TableHead className="h-12 px-4">{t("devices.columns.lastActive")}</TableHead>
                <TableHead className="h-12 w-16 px-4 last:pr-6">
                  <span className="sr-only">{t("devices.columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: SKELETON_ROW_COUNT }).map((_, skeletonIndex) => (
                <TableRow className="h-14" key={`skeleton-row-${skeletonIndex}`}>
                  <TableCell className="px-4 py-3 first:pl-6">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </TableCell>
                  <TableCell className="px-4 py-3 last:pr-6">
                    <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {isError && (
        <div className="animate-in rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-12 text-center backdrop-blur-md duration-500 fill-mode-both fade-in">
          <p
            className="font-display text-base font-normal text-destructive"
            style={{ letterSpacing: "-0.02em" }}
          >
            {t("devices.error.title")}
          </p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            {error instanceof Error ? error.message : t("devices.error.title")}
          </p>
          <Button className="mt-4" onClick={handleRetryClick} size="sm" variant="outline">
            {t("devices.error.retry")}
          </Button>
        </div>
      )}

      {!isLoading && !isError && devices !== undefined && devices.length === 0 && (
        <div className="animate-in rounded-2xl border border-border/60 bg-card/70 px-8 py-20 text-center backdrop-blur-md duration-700 fill-mode-both fade-in">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/8">
            <MonitorSmartphone className="size-6 text-primary/70" />
          </div>
          <p
            className="font-display text-lg font-normal text-foreground"
            style={{ letterSpacing: "-0.02em" }}
          >
            {t("devices.empty")}
          </p>
        </div>
      )}

      {!isLoading && !isError && devices !== undefined && devices.length > 0 && (
        <div className="animate-in overflow-hidden rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md duration-500 fill-mode-both fade-in">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm [&_tr]:border-b">
              <TableRow>
                <TableHead className="h-12 px-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase first:pl-6">
                  {t("devices.columns.name")}
                </TableHead>
                <TableHead className="h-12 px-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  {t("devices.columns.ip")}
                </TableHead>
                <TableHead className="h-12 px-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                  {t("devices.columns.lastActive")}
                </TableHead>
                <TableHead className="h-12 w-16 px-4 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase last:pr-6">
                  <span className="sr-only">{t("devices.columns.actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devices.map((device) => (
                <DeviceRow
                  device={device}
                  isTerminatePending={
                    terminateDevice.isPending && terminateDevice.variables === device.deviceId
                  }
                  key={device.deviceId}
                  onTerminateClick={handleTerminateOneClick}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog onOpenChange={setTerminateAllOpen} open={terminateAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("devices.terminateAllConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("devices.terminateAllConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={terminateOtherDevices.isPending}
              onClick={handleTerminateAllCancel}
            >
              {t("devices.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={terminateOtherDevices.isPending}
              onClick={handleTerminateAllConfirm}
            >
              {t("devices.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog onOpenChange={handleTerminateOneDialogOpenChange} open={terminateOneDialog.open}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("devices.terminateOneConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("devices.terminateOneConfirmDescription", {
                title: terminateOneDialog.open ? terminateOneDialog.title : "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={terminateDevice.isPending}
              onClick={handleTerminateOneCancel}
            >
              {t("devices.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={terminateDevice.isPending}
              onClick={handleTerminateOneConfirm}
            >
              {t("devices.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function formatLastActive(isoString: string) {
  const parsed = parseISO(isoString);
  if (!isValid(parsed)) return { absolute: isoString, relative: "—" };
  return {
    absolute: format(parsed, "PPpp"),
    relative: formatDistanceToNow(parsed, { addSuffix: true }),
  };
}

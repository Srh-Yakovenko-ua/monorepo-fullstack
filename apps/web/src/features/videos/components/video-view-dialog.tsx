import type { VideoViewModel } from "@app/shared";

import { Download, Video } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type VideoViewDialogProps = {
  onDelete: () => void;
  onEdit: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  video: VideoViewModel;
};

export function VideoViewDialog({
  onDelete,
  onEdit,
  onOpenChange,
  open,
  video,
}: VideoViewDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{video.title}</DialogTitle>
          <DialogDescription>{video.author}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-0">
          <div className="relative overflow-hidden px-7 pt-8 pb-7">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse 80% 100% at 0% 0%, oklch(from var(--primary) l c h / 0.08), transparent 65%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Video aria-hidden className="size-5 text-primary" />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p
                  aria-hidden
                  className="font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase"
                >
                  {t("videos.detail.eyebrow")}
                </p>
                <p
                  aria-hidden
                  className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-tight font-normal"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {video.title}
                </p>
                <p className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                  {video.author}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-border/60" />

          <div className="flex flex-col gap-4 px-7 py-6">
            <div className="flex flex-wrap gap-1.5">
              {video.availableResolutions.map((resolution) => (
                <span
                  className="rounded-md border border-border/60 bg-card/60 px-2 py-0.5 font-mono text-[10px] tracking-wide text-muted-foreground"
                  key={resolution}
                >
                  {resolution}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              {video.canBeDownloaded && (
                <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-primary uppercase">
                  <Download className="size-3" />
                  {t("videos.detail.downloadable")}
                </span>
              )}
              {video.minAgeRestriction !== null && (
                <span className="rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-[10px] tracking-wide text-destructive">
                  {video.minAgeRestriction}+
                </span>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div className="flex flex-col gap-0.5">
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
                  {t("videos.detail.createdAt")}
                </dt>
                <dd className="text-sm text-foreground">{formatDate(video.createdAt)}</dd>
              </div>
              <div className="flex flex-col gap-0.5">
                <dt className="font-mono text-[9px] tracking-[0.2em] text-muted-foreground uppercase">
                  {t("videos.detail.publicationDate")}
                </dt>
                <dd className="text-sm text-foreground">{formatDate(video.publicationDate)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="h-px w-full bg-border/60" />

        <div className="flex justify-end gap-2 px-7 py-4">
          <Button onClick={onEdit} size="sm" type="button" variant="outline">
            {t("videos.detail.edit")}
          </Button>
          <Button onClick={onDelete} size="sm" type="button" variant="destructive">
            {t("videos.detail.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

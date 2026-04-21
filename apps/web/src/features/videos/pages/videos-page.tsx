import type { VideoViewModel } from "@app/shared";

import { Download, MoreHorizontal, Plus, Video } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CardActionButton } from "@/components/ui/card-action-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { ModalId, modalObserver } from "@/features/modals";
import { VideoFormDialog } from "@/features/videos/components/video-form-dialog";
import { VideoViewDialog } from "@/features/videos/components/video-view-dialog";
import { useDeleteVideo } from "@/features/videos/hooks/use-video-mutations";
import { useVideos } from "@/features/videos/hooks/use-videos";
import { usePageTitle } from "@/hooks/use-page-title";
import { gradientFromString } from "@/lib/gradient-from-string";
import { cn } from "@/lib/utils";

const MAX_PREVIEW = 15;

export function VideosPage() {
  const { t } = useTranslation();
  usePageTitle(t("videos.list.title"));
  const { data, error, isError, isLoading } = useVideos();
  const deleteVideo = useDeleteVideo();
  const [createOpen, setCreateOpen] = useState(false);
  const [editVideo, setEditVideo] = useState<null | VideoViewModel>(null);
  const [viewVideo, setViewVideo] = useState<null | VideoViewModel>(null);

  const videos = data ? [...data].slice(-MAX_PREVIEW).reverse() : [];

  function openEdit(video: VideoViewModel) {
    setViewVideo(null);
    setEditVideo(video);
  }

  function openDeleteConfirm(video: VideoViewModel) {
    setViewVideo(null);
    modalObserver.addModal(ModalId.Confirm, {
      confirmLabel: t("videos.detail.deleteModal.confirmLabel"),
      description: t("videos.detail.deleteModal.description"),
      onConfirm: async () => {
        try {
          await deleteVideo.mutateAsync(video.id);
          toast.success(t("videos.toasts.deleted"));
        } catch {
          toast.error(t("videos.toasts.deleteFailed"));
        }
      },
      title: t("videos.detail.deleteModal.title"),
      tone: "destructive",
    });
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleEditFormOpenChange(open: boolean) {
    if (!open) setEditVideo(null);
  }

  function handleViewOpenChange(open: boolean) {
    if (!open) setViewVideo(null);
  }

  function handleViewDelete() {
    if (viewVideo) openDeleteConfirm(viewVideo);
  }

  function handleViewEdit() {
    if (viewVideo) openEdit(viewVideo);
  }

  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <div className="flex justify-end pt-5">
        <Button className="shrink-0 gap-1.5" onClick={handleOpenCreate} size="sm">
          <Plus className="size-3.5" />
          {t("videos.list.createButton")}
        </Button>
      </div>

      <section className="mt-5">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, skeletonIndex) => (
              <div
                className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm"
                key={`skeleton-loading-${skeletonIndex}`}
              >
                <Skeleton className="h-36 rounded-none" />
                <div className="flex flex-col gap-2 p-5">
                  <Skeleton className="h-4 w-3/4 rounded-sm" />
                  <Skeleton className="h-3 w-full rounded-sm" />
                  <Skeleton className="h-3 w-2/3 rounded-sm" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="animate-in rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-12 text-center backdrop-blur-md duration-500 fill-mode-both fade-in">
            <p
              className="font-display text-base font-normal text-destructive"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("videos.list.error")}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {error.message}
            </p>
          </div>
        )}

        {!isLoading && !isError && videos.length === 0 && (
          <div className="animate-in rounded-2xl border border-border/60 bg-card/70 px-8 py-20 text-center shadow-[var(--shadow-card)] backdrop-blur-md duration-700 fill-mode-both fade-in">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/8">
              <Video className="size-6 text-primary/70" />
            </div>
            <p
              className="font-display text-lg font-normal text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("videos.list.empty")}
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {t("videos.list.emptyDescription")}
            </p>
            <Button
              className="mt-6 gap-1.5 transition-all duration-150 hover:ring-4 hover:ring-primary/15"
              onClick={handleOpenCreate}
              size="sm"
              variant="outline"
            >
              <Plus className="size-3.5" />
              {t("videos.list.createButton")}
            </Button>
          </div>
        )}

        {!isLoading && !isError && videos.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video, videoIndex) => (
              <VideoCard
                index={videoIndex}
                key={video.id}
                onDelete={openDeleteConfirm}
                onEdit={setEditVideo}
                onView={setViewVideo}
                video={video}
              />
            ))}
          </div>
        )}
      </section>

      <VideoFormDialog mode="create" onOpenChange={setCreateOpen} open={createOpen} />

      {editVideo && (
        <VideoFormDialog
          mode="edit"
          onOpenChange={handleEditFormOpenChange}
          open={!!editVideo}
          video={editVideo}
        />
      )}

      {viewVideo && (
        <VideoViewDialog
          onDelete={handleViewDelete}
          onEdit={handleViewEdit}
          onOpenChange={handleViewOpenChange}
          open={!!viewVideo}
          video={viewVideo}
        />
      )}
    </main>
  );
}

function VideoCard({
  index,
  onDelete,
  onEdit,
  onView,
  video,
}: {
  index: number;
  onDelete: (video: VideoViewModel) => void;
  onEdit: (video: VideoViewModel) => void;
  onView: (video: VideoViewModel) => void;
  video: VideoViewModel;
}) {
  const { t } = useTranslation();

  function handleView() {
    onView(video);
  }

  function handleEdit() {
    onEdit(video);
  }

  function handleDelete() {
    onDelete(video);
  }

  return (
    <article
      className={cn(
        "group relative flex animate-in flex-col rounded-2xl",
        "border border-border/60 bg-card/80 backdrop-blur-md",
        "shadow-[var(--shadow-card)]",
        "transition-all duration-200 hover:-translate-y-1",
        "hover:border-primary/25 hover:shadow-[var(--shadow-pop)]",
        "overflow-hidden fill-mode-both fade-in slide-in-from-bottom-2",
      )}
      style={{ animationDelay: `${index * 60}ms`, animationDuration: "500ms" }}
    >
      <button
        aria-label={t("actions.open")}
        className="relative block h-36 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
        onClick={handleView}
        type="button"
      >
        <div
          className="absolute inset-0"
          style={{ background: gradientFromString(String(video.id)) }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Video className="size-10 text-white/60" />
        </div>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CardActionButton aria-label={t("actions.menu")}>
            <MoreHorizontal className="size-4" />
          </CardActionButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem className="cursor-pointer" onSelect={handleView}>
            <Video className="mr-2 size-3.5 text-muted-foreground" />
            {t("actions.open")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onSelect={handleEdit}>
            <span className="mr-2 size-3.5 text-muted-foreground">✎</span>
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-destructive" onSelect={handleDelete}>
            {t("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-1 flex-col gap-1.5">
          <h2 className="line-clamp-1 text-base leading-snug font-semibold">
            <button
              className="cursor-pointer rounded-sm text-foreground transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
              onClick={handleView}
              type="button"
            >
              {video.title}
            </button>
          </h2>
          <p className="font-mono text-[11px] tracking-[0.1em] text-muted-foreground">
            {video.author}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {video.availableResolutions.slice(0, 3).map((resolution) => (
            <span
              className="rounded-sm border border-border/50 bg-muted/40 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-muted-foreground"
              key={resolution}
            >
              {resolution}
            </span>
          ))}
          {video.availableResolutions.length > 3 && (
            <span className="font-mono text-[9px] text-muted-foreground">
              +{video.availableResolutions.length - 3}
            </span>
          )}

          {video.minAgeRestriction !== null && (
            <span className="ml-auto rounded-sm bg-destructive/10 px-1.5 py-0.5 font-mono text-[9px] text-destructive">
              {video.minAgeRestriction}+
            </span>
          )}

          {video.canBeDownloaded && (
            <Download
              aria-label={t("videos.detail.downloadable")}
              className={cn("size-3 text-primary", video.minAgeRestriction === null && "ml-auto")}
            />
          )}
        </div>
      </div>
    </article>
  );
}

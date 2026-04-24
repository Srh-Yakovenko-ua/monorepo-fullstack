import type { VideoResolution, VideoViewModel } from "@app/shared";
import type { z } from "zod";

import { CreateVideoInputSchema, UpdateVideoInputSchema, VIDEO_RESOLUTIONS } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateVideo, useUpdateVideo } from "@/features/videos/hooks/use-video-mutations";
import { ApiError } from "@/lib/http-client";

type CreateValues = z.infer<typeof CreateVideoInputSchema>;

type EditValues = z.infer<typeof UpdateVideoInputSchema>;
type VideoFormDialogProps =
  | {
      mode: "create";
      onOpenChange: (open: boolean) => void;
      open: boolean;
      video?: undefined;
    }
  | {
      mode: "edit";
      onOpenChange: (open: boolean) => void;
      open: boolean;
      video: VideoViewModel;
    };

export function VideoFormDialog({ mode, onOpenChange, open, video }: VideoFormDialogProps) {
  const { t } = useTranslation();

  function handleClose() {
    onOpenChange(false);
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-md"
      >
        <DialogHeader className="sticky top-0 z-10 border-b border-border/60 bg-popover px-7 pt-7 pb-6">
          <DialogTitle
            className="font-display text-xl font-normal"
            style={{ letterSpacing: "-0.025em" }}
          >
            {mode === "create" ? t("videos.form.createTitle") : t("videos.form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        {mode === "create" ? (
          <CreateForm onClose={handleClose} />
        ) : (
          <EditForm onClose={handleClose} video={video} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateForm({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const createVideo = useCreateVideo();
  const isPending = createVideo.isPending;

  const form = useForm<CreateValues>({
    defaultValues: { author: "", availableResolutions: [], title: "" },
    resolver: zodResolver(CreateVideoInputSchema),
  });

  const titleValue = useWatch({ control: form.control, name: "title" });
  const authorValue = useWatch({ control: form.control, name: "author" });
  const selectedResolutions = useWatch({ control: form.control, name: "availableResolutions" });

  async function onSubmit(values: CreateValues) {
    try {
      await createVideo.mutateAsync(values);
      toast.success(t("videos.toasts.created"));
      onClose();
      form.reset();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("common.somethingWentWrong"));
      }
    }
  }

  return (
    <form
      className="flex flex-col gap-4 px-7 pt-6 pb-4"
      id="video-form"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-title">{t("videos.form.titleLabel")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {t("videos.form.titleCounter", { current: titleValue?.length ?? 0 })}
          </span>
        </div>
        <Input
          id="video-title"
          placeholder={t("videos.form.titlePlaceholder")}
          {...form.register("title")}
          aria-describedby={form.formState.errors.title ? "video-title-error" : undefined}
          aria-invalid={!!form.formState.errors.title}
        />
        <FieldError error={form.formState.errors.title} id="video-title-error" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-author">{t("videos.form.authorLabel")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {t("videos.form.authorCounter", { current: authorValue?.length ?? 0 })}
          </span>
        </div>
        <Input
          id="video-author"
          placeholder={t("videos.form.authorPlaceholder")}
          {...form.register("author")}
          aria-describedby={form.formState.errors.author ? "video-author-error" : undefined}
          aria-invalid={!!form.formState.errors.author}
        />
        <FieldError error={form.formState.errors.author} id="video-author-error" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>{t("videos.form.resolutionsLabel")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {t("videos.form.resolutionsSelected", { count: selectedResolutions?.length ?? 0 })}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Controller
            control={form.control}
            name="availableResolutions"
            render={({ field }) => (
              <ResolutionChips onChange={field.onChange} value={field.value} />
            )}
          />
        </div>
        {form.formState.errors.availableResolutions && (
          <p className="text-[12px] text-destructive">
            {form.formState.errors.availableResolutions.message}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 z-10 flex justify-end border-t border-border/60 bg-popover py-3">
        <Button disabled={form.formState.isSubmitting} loading={isPending} type="submit">
          {t("common.create")}
        </Button>
      </div>
    </form>
  );
}

function EditForm({ onClose, video }: { onClose: () => void; video: VideoViewModel }) {
  const { t } = useTranslation();
  const updateVideo = useUpdateVideo(video.id);
  const isPending = updateVideo.isPending;

  const defaultValues: EditValues = {
    author: video.author,
    availableResolutions: video.availableResolutions,
    canBeDownloaded: video.canBeDownloaded,
    minAgeRestriction: video.minAgeRestriction,
    publicationDate: video.publicationDate,
    title: video.title,
  };

  const form = useForm<EditValues>({
    defaultValues,
    resolver: zodResolver(UpdateVideoInputSchema),
  });

  useEffect(() => {
    form.reset({
      author: video.author,
      availableResolutions: video.availableResolutions,
      canBeDownloaded: video.canBeDownloaded,
      minAgeRestriction: video.minAgeRestriction,
      publicationDate: video.publicationDate,
      title: video.title,
    });
  }, [video, form]);

  const titleValue = useWatch({ control: form.control, name: "title" });
  const authorValue = useWatch({ control: form.control, name: "author" });
  const selectedResolutions = useWatch({ control: form.control, name: "availableResolutions" });
  const canBeDownloaded = useWatch({ control: form.control, name: "canBeDownloaded" });
  const minAgeRestriction = useWatch({ control: form.control, name: "minAgeRestriction" });

  async function onSubmit(values: EditValues) {
    try {
      await updateVideo.mutateAsync(values);
      toast.success(t("videos.toasts.updated"));
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error(t("common.somethingWentWrong"));
      }
    }
  }

  function handleMinAgeToggle() {
    form.setValue("minAgeRestriction", minAgeRestriction === null ? 18 : null);
  }

  function handleMinAgeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    form.setValue(
      "minAgeRestriction",
      val === "" ? null : Math.min(18, Math.max(1, parseInt(val, 10))),
    );
  }

  return (
    <form
      className="flex flex-col gap-4 px-7 pt-6 pb-4"
      id="video-form"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-title">{t("videos.form.titleLabel")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {t("videos.form.titleCounter", { current: titleValue?.length ?? 0 })}
          </span>
        </div>
        <Input
          id="video-title"
          placeholder={t("videos.form.titlePlaceholder")}
          {...form.register("title")}
          aria-describedby={form.formState.errors.title ? "video-title-error" : undefined}
          aria-invalid={!!form.formState.errors.title}
        />
        <FieldError error={form.formState.errors.title} id="video-title-error" />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-author">{t("videos.form.authorLabel")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {t("videos.form.authorCounter", { current: authorValue?.length ?? 0 })}
          </span>
        </div>
        <Input
          id="video-author"
          placeholder={t("videos.form.authorPlaceholder")}
          {...form.register("author")}
          aria-describedby={form.formState.errors.author ? "video-author-error" : undefined}
          aria-invalid={!!form.formState.errors.author}
        />
        <FieldError error={form.formState.errors.author} id="video-author-error" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>{t("videos.form.resolutionsLabel")}</Label>
          <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
            {t("videos.form.resolutionsSelected", { count: selectedResolutions?.length ?? 0 })}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Controller
            control={form.control}
            name="availableResolutions"
            render={({ field }) => (
              <ResolutionChips onChange={field.onChange} value={field.value} />
            )}
          />
        </div>
        {form.formState.errors.availableResolutions && (
          <p className="text-[12px] text-destructive">
            {form.formState.errors.availableResolutions.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="video-canBeDownloaded">{t("videos.form.canBeDownloadedLabel")}</Label>
        <Controller
          control={form.control}
          name="canBeDownloaded"
          render={({ field }) => (
            <Switch
              checked={field.value}
              id="video-canBeDownloaded"
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
      <p className="-mt-3 font-mono text-[10px] text-muted-foreground">
        {canBeDownloaded ? t("videos.form.canBeDownloadedOn") : t("videos.form.canBeDownloadedOff")}
      </p>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-minAgeRestriction">{t("videos.form.minAgeRestrictionLabel")}</Label>
          <button
            className="cursor-pointer font-mono text-[10px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            onClick={handleMinAgeToggle}
            type="button"
          >
            {minAgeRestriction === null
              ? t("videos.form.minAgeRestrictionEnable")
              : t("videos.form.minAgeRestrictionDisable")}
          </button>
        </div>
        <Input
          disabled={minAgeRestriction === null}
          id="video-minAgeRestriction"
          max={18}
          min={1}
          onChange={handleMinAgeChange}
          placeholder={t("videos.form.minAgeRestrictionPlaceholder")}
          type="number"
          value={minAgeRestriction ?? ""}
        />
        <FieldError
          error={form.formState.errors.minAgeRestriction}
          id="video-minAgeRestriction-error"
        />
      </div>

      <div className="sticky bottom-0 z-10 flex justify-end border-t border-border/60 bg-popover py-3">
        <Button disabled={form.formState.isSubmitting} loading={isPending} type="submit">
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function ResolutionChips({
  onChange,
  value,
}: {
  onChange: (next: VideoResolution[]) => void;
  value: readonly VideoResolution[];
}) {
  function handleResolutionToggle(event: React.ChangeEvent<HTMLInputElement>) {
    const nextResolution = VIDEO_RESOLUTIONS.find(
      (candidate) => candidate === event.currentTarget.dataset.resolution,
    );
    if (!nextResolution) return;
    if (event.target.checked) {
      onChange([...value, nextResolution]);
    } else {
      onChange(value.filter((otherResolution) => otherResolution !== nextResolution));
    }
  }

  return (
    <>
      {VIDEO_RESOLUTIONS.map((resolution) => {
        const isChecked = value.includes(resolution);
        return (
          <label
            className="flex cursor-pointer items-center rounded-full bg-muted/50 px-3 py-1 font-mono text-[11px] text-muted-foreground transition-colors duration-150 hover:bg-muted has-[input:checked]:bg-primary has-[input:checked]:text-primary-foreground"
            key={resolution}
          >
            <input
              checked={isChecked}
              className="sr-only"
              data-resolution={resolution}
              onChange={handleResolutionToggle}
              type="checkbox"
            />
            {resolution}
          </label>
        );
      })}
    </>
  );
}

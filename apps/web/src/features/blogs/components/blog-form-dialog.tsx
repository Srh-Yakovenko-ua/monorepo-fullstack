import type { BlogViewModel } from "@app/shared";
import type { Path } from "react-hook-form";
import type { z } from "zod";

import { BlogInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateBlog, useUpdateBlog } from "@/features/blogs/hooks/use-blog-mutations";
import { ApiError } from "@/lib/http-client";

type BlogFormDialogProps =
  | {
      blog: BlogViewModel;
      mode: "edit";
      onOpenChange: (open: boolean) => void;
      open: boolean;
    }
  | { blog?: undefined; mode: "create"; onOpenChange: (open: boolean) => void; open: boolean };

type BlogFormValues = z.infer<typeof BlogInputSchema>;

export function BlogFormDialog({ blog, mode, onOpenChange, open }: BlogFormDialogProps) {
  const { t } = useTranslation();
  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog(blog?.id ?? "");

  const form = useForm<BlogFormValues>({
    defaultValues: blog ?? { description: "", name: "", websiteUrl: "" },
    resolver: zodResolver(BlogInputSchema),
  });

  const nameValue = useWatch({ control: form.control, name: "name" });
  const descriptionValue = useWatch({ control: form.control, name: "description" });

  useEffect(() => {
    if (open) {
      form.reset(blog ?? { description: "", name: "", websiteUrl: "" });
    }
  }, [open, blog, form]);

  const isPending = createBlog.isPending || updateBlog.isPending;

  async function onSubmit(values: BlogFormValues) {
    try {
      if (mode === "create") {
        await createBlog.mutateAsync(values);
        toast.success(t("blogs.toasts.created"));
      } else {
        await updateBlog.mutateAsync(values);
        toast.success(t("blogs.toasts.updated"));
      }
      onOpenChange(false);
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        err.fieldErrors.forEach(({ field, message }) => {
          form.setError(field as Path<BlogFormValues>, { message });
        });
        toast.error(t("common.fixFormErrors"));
      } else {
        toast.error(err instanceof Error ? err.message : t("common.somethingWentWrong"));
      }
    }
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent aria-describedby={undefined} className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-7 pt-7 pb-6">
          <DialogTitle
            className="font-display text-xl font-normal"
            style={{ letterSpacing: "-0.025em" }}
          >
            {mode === "create" ? t("blogs.form.createTitle") : t("blogs.form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="h-px w-full bg-border/60" />

        <form
          className="flex flex-col gap-5 px-7 py-6"
          id="blog-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="blog-name">{t("blogs.form.nameLabel")}</Label>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {t("blogs.form.nameCounter", { current: nameValue?.length ?? 0 })}
              </span>
            </div>
            <Input
              id="blog-name"
              placeholder={t("blogs.form.namePlaceholder")}
              {...form.register("name")}
              aria-describedby={form.formState.errors.name ? "blog-name-error" : undefined}
              aria-invalid={!!form.formState.errors.name}
            />
            <FieldError error={form.formState.errors.name} id="blog-name-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="blog-description">{t("blogs.form.descriptionLabel")}</Label>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {t("blogs.form.descriptionCounter", { current: descriptionValue?.length ?? 0 })}
              </span>
            </div>
            <Textarea
              id="blog-description"
              placeholder={t("blogs.form.descriptionPlaceholder")}
              rows={3}
              {...form.register("description")}
              aria-describedby={
                form.formState.errors.description ? "blog-description-error" : undefined
              }
              aria-invalid={!!form.formState.errors.description}
            />
            <FieldError error={form.formState.errors.description} id="blog-description-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="blog-websiteUrl">{t("blogs.form.websiteUrlLabel")}</Label>
            <Input
              id="blog-websiteUrl"
              placeholder={t("blogs.form.websiteUrlPlaceholder")}
              type="url"
              {...form.register("websiteUrl")}
              aria-describedby={
                form.formState.errors.websiteUrl ? "blog-websiteUrl-error" : undefined
              }
              aria-invalid={!!form.formState.errors.websiteUrl}
            />
            <FieldError error={form.formState.errors.websiteUrl} id="blog-websiteUrl-error" />
          </div>
        </form>

        <div className="h-px w-full bg-border/60" />

        <div className="flex justify-end px-7 py-4">
          <Button disabled={isPending} form="blog-form" type="submit">
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {mode === "create" ? t("common.create") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

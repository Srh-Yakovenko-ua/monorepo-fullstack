import type { Path } from "react-hook-form";
import type { z } from "zod";

import { PostInputSchema } from "@app/shared";
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
import { Textarea } from "@/components/ui/textarea";
import { BlogCombobox } from "@/features/blogs";
import { modalObserver } from "@/features/modals/lib/modal-observer";
import { ModalId, type ModalPayloads } from "@/features/modals/lib/modal-registry";
import { useCreatePost, useUpdatePost } from "@/features/posts/hooks/use-post-mutations";
import { ApiError } from "@/lib/http-client";

type PostFormValues = z.infer<typeof PostInputSchema>;

type Props = {
  isOpen: boolean;
  props: ModalPayloads[typeof ModalId.PostForm];
};

export function PostFormDialog({ isOpen, props }: Props) {
  const { t } = useTranslation();
  const post = props.mode === "edit" ? props.post : undefined;
  const mode = props.mode;

  const createPost = useCreatePost();
  const updatePost = useUpdatePost(post?.id ?? "");

  const form = useForm<PostFormValues>({
    defaultValues: post
      ? {
          blogId: post.blogId,
          content: post.content,
          shortDescription: post.shortDescription,
          title: post.title,
        }
      : { blogId: "", content: "", shortDescription: "", title: "" },
    resolver: zodResolver(PostInputSchema),
  });

  const titleValue = useWatch({ control: form.control, name: "title" });
  const shortDescriptionValue = useWatch({ control: form.control, name: "shortDescription" });
  const contentValue = useWatch({ control: form.control, name: "content" });

  useEffect(() => {
    if (!isOpen) return;
    form.reset(
      post
        ? {
            blogId: post.blogId,
            content: post.content,
            shortDescription: post.shortDescription,
            title: post.title,
          }
        : { blogId: "", content: "", shortDescription: "", title: "" },
    );
  }, [isOpen, post, form]);

  const isPending = createPost.isPending || updatePost.isPending;

  function handleClose() {
    modalObserver.removeModal(ModalId.PostForm);
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  async function onSubmit(values: PostFormValues) {
    try {
      if (mode === "create") {
        await createPost.mutateAsync(values);
        toast.success(t("posts.toasts.created"));
      } else {
        await updatePost.mutateAsync(values);
        toast.success(t("posts.toasts.updated"));
      }
      handleClose();
      form.reset();
    } catch (err) {
      if (err instanceof ApiError && err.fieldErrors) {
        err.fieldErrors.forEach(({ field, message }) => {
          form.setError(field as Path<PostFormValues>, { message });
        });
        toast.error(t("common.fixFormErrors"));
      } else {
        toast.error(err instanceof Error ? err.message : t("common.somethingWentWrong"));
      }
    }
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent aria-describedby={undefined} className="gap-0 p-0 sm:max-w-md">
        <DialogHeader className="px-7 pt-7 pb-6">
          <DialogTitle
            className="font-display text-xl font-normal"
            style={{ letterSpacing: "-0.025em" }}
          >
            {mode === "create" ? t("posts.form.createTitle") : t("posts.form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <div className="h-px w-full bg-border/60" />

        <form
          className="flex flex-col gap-5 px-7 py-6"
          id="post-form"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-title">{t("posts.form.titleLabel")}</Label>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {t("posts.form.titleCounter", { current: titleValue?.length ?? 0 })}
              </span>
            </div>
            <Input
              id="post-title"
              placeholder={t("posts.form.titlePlaceholder")}
              {...form.register("title")}
              aria-describedby={form.formState.errors.title ? "post-title-error" : undefined}
              aria-invalid={!!form.formState.errors.title}
            />
            <FieldError error={form.formState.errors.title} id="post-title-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-shortDescription">{t("posts.form.shortDescriptionLabel")}</Label>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {t("posts.form.shortDescriptionCounter", {
                  current: shortDescriptionValue?.length ?? 0,
                })}
              </span>
            </div>
            <Textarea
              id="post-shortDescription"
              placeholder={t("posts.form.shortDescriptionPlaceholder")}
              rows={2}
              {...form.register("shortDescription")}
              aria-describedby={
                form.formState.errors.shortDescription ? "post-shortDescription-error" : undefined
              }
              aria-invalid={!!form.formState.errors.shortDescription}
            />
            <FieldError
              error={form.formState.errors.shortDescription}
              id="post-shortDescription-error"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-content">{t("posts.form.contentLabel")}</Label>
              <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                {t("posts.form.contentCounter", { current: contentValue?.length ?? 0 })}
              </span>
            </div>
            <Textarea
              id="post-content"
              placeholder={t("posts.form.contentPlaceholder")}
              rows={4}
              {...form.register("content")}
              aria-describedby={form.formState.errors.content ? "post-content-error" : undefined}
              aria-invalid={!!form.formState.errors.content}
            />
            <FieldError error={form.formState.errors.content} id="post-content-error" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="post-blogId">{t("posts.form.blogIdLabel")}</Label>
            <Controller
              control={form.control}
              name="blogId"
              render={({ field }) => (
                <BlogCombobox
                  aria-describedby={form.formState.errors.blogId ? "post-blogId-error" : undefined}
                  aria-invalid={!!form.formState.errors.blogId}
                  id="post-blogId"
                  initialLabel={post?.blogName}
                  onValueChange={field.onChange}
                  value={field.value}
                />
              )}
            />
            <FieldError error={form.formState.errors.blogId} id="post-blogId-error" />
          </div>
        </form>

        <div className="h-px w-full bg-border/60" />

        <div className="flex justify-end px-7 py-4">
          <Button form="post-form" loading={isPending} type="submit">
            {mode === "create" ? t("common.create") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import type { PostViewModel } from "@app/shared";
import type { Path } from "react-hook-form";
import type { z } from "zod";

import { PostInputSchema } from "@app/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useBlogs } from "@/features/blogs/hooks/use-blogs";
import { useCreatePost, useUpdatePost } from "@/features/posts/hooks/use-post-mutations";
import { ApiError } from "@/lib/http-client";

type PostFormDialogProps =
  | { mode: "create"; onOpenChange: (open: boolean) => void; open: boolean; post?: undefined }
  | {
      mode: "edit";
      onOpenChange: (open: boolean) => void;
      open: boolean;
      post: PostViewModel;
    };

type PostFormValues = z.infer<typeof PostInputSchema>;

export function PostFormDialog({ mode, onOpenChange, open, post }: PostFormDialogProps) {
  const { t } = useTranslation();
  const createPost = useCreatePost();
  const updatePost = useUpdatePost(post?.id ?? "");
  const { data: blogs } = useBlogs();

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
    if (!open) return;
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
  }, [open, post, form]);

  const isPending = createPost.isPending || updatePost.isPending;
  const noBlogs = !blogs || blogs.length === 0;

  async function onSubmit(values: PostFormValues) {
    try {
      if (mode === "create") {
        await createPost.mutateAsync(values);
        toast.success(t("posts.toasts.created"));
      } else {
        await updatePost.mutateAsync(values);
        toast.success(t("posts.toasts.updated"));
      }
      onOpenChange(false);
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("posts.form.createTitle") : t("posts.form.editTitle")}
          </DialogTitle>
        </DialogHeader>

        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="post-title">{t("posts.form.titleLabel")}</Label>
              <span className="font-mono text-[10px] text-muted-foreground">
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
              <span className="font-mono text-[10px] text-muted-foreground">
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
              <span className="font-mono text-[10px] text-muted-foreground">
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
            <Select
              defaultValue={post?.blogId}
              disabled={noBlogs}
              onValueChange={(value) => form.setValue("blogId", value, { shouldValidate: true })}
            >
              <SelectTrigger
                aria-describedby={form.formState.errors.blogId ? "post-blogId-error" : undefined}
                aria-invalid={!!form.formState.errors.blogId}
                className="w-full"
                id="post-blogId"
              >
                <SelectValue
                  placeholder={
                    noBlogs
                      ? t("posts.form.blogIdPlaceholderEmpty")
                      : t("posts.form.blogIdPlaceholder")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {blogs?.map((blog) => (
                  <SelectItem key={blog.id} value={blog.id}>
                    {blog.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError error={form.formState.errors.blogId} id="post-blogId-error" />
          </div>

          <DialogFooter>
            <Button disabled={isPending || noBlogs} type="submit">
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {mode === "create" ? t("common.create") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

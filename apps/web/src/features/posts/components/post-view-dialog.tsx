import type { PostViewModel } from "@app/shared";

import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PostViewDialogProps = {
  onDelete: () => void;
  onEdit: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  post: PostViewModel;
};

export function PostViewDialog({
  onDelete,
  onEdit,
  onOpenChange,
  open,
  post,
}: PostViewDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="gap-0 p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{post.title}</DialogTitle>
          <DialogDescription>{post.shortDescription || post.blogName || ""}</DialogDescription>
        </DialogHeader>

        <div className="relative overflow-hidden px-7 pt-8 pb-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 100% at 0% 0%, oklch(from var(--info) l c h / 0.07), transparent 65%)",
            }}
          />
          <div className="relative flex items-start gap-4">
            <div className="mt-1 flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText aria-hidden className="size-5 text-primary" />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              {post.blogName && (
                <p
                  aria-hidden
                  className="font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase"
                >
                  {post.blogName}
                </p>
              )}
              <p
                aria-hidden
                className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-tight font-normal"
                style={{ letterSpacing: "-0.03em" }}
              >
                {post.title}
              </p>
            </div>
          </div>
        </div>

        <div className="h-px w-full bg-border/60" />

        <div className="flex max-h-[50vh] flex-col gap-5 overflow-y-auto px-7 py-6">
          {post.shortDescription && (
            <p className="text-sm leading-relaxed font-medium text-foreground">
              {post.shortDescription}
            </p>
          )}

          {post.content && (
            <p className="text-sm leading-relaxed text-muted-foreground">{post.content}</p>
          )}
        </div>

        <div className="h-px w-full bg-border/60" />

        <DialogFooter className="gap-2 px-7 py-5 sm:gap-2">
          <Button
            className="cursor-pointer transition-all duration-150 hover:ring-4 hover:ring-primary/15"
            onClick={onEdit}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("posts.detail.edit")}
          </Button>
          <Button
            className="cursor-pointer"
            onClick={onDelete}
            size="sm"
            type="button"
            variant="destructive"
          >
            {t("posts.detail.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

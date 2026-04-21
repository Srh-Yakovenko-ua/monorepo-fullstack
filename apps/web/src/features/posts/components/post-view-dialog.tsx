import type { PostViewModel } from "@app/shared";

import { FileText } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{post.title}</DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-2 -top-4 h-32 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 50% 70% at 20% 40%, oklch(from var(--info) l c h / 0.07), transparent 65%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <div className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                <FileText className="size-5 text-primary/70" />
              </div>
              <div className="flex flex-col gap-1">
                {post.blogName && (
                  <p className="font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase">
                    {post.blogName}
                  </p>
                )}
                <h2
                  className="font-display text-2xl leading-tight font-normal"
                  style={{ letterSpacing: "-0.028em" }}
                >
                  {post.title}
                </h2>
                <div className="mt-1 h-0.5 w-8 rounded-full bg-gradient-to-r from-primary/60 to-primary/0" />
              </div>
            </div>
          </div>

          {post.shortDescription && (
            <p className="text-sm leading-relaxed font-medium text-foreground">
              {post.shortDescription}
            </p>
          )}

          {post.content && (
            <p className="text-sm leading-relaxed text-muted-foreground">{post.content}</p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
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

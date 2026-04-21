import type { BlogViewModel } from "@app/shared";

import { BookOpen, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type BlogViewDialogProps = {
  blog: BlogViewModel;
  onDelete: () => void;
  onEdit: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function BlogViewDialog({
  blog,
  onDelete,
  onEdit,
  onOpenChange,
  open,
}: BlogViewDialogProps) {
  const { t } = useTranslation();

  const websiteHostname = blog.websiteUrl
    ? (() => {
        try {
          return new URL(blog.websiteUrl).hostname;
        } catch {
          return blog.websiteUrl;
        }
      })()
    : null;

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{blog.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-2 -top-4 h-32 opacity-50"
              style={{
                background:
                  "radial-gradient(ellipse 50% 70% at 20% 40%, oklch(from var(--primary) l c h / 0.07), transparent 65%)",
              }}
            />
            <div className="relative flex items-start gap-4">
              <div className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/8">
                <BookOpen className="size-5 text-primary/70" />
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase">
                  {t("blogs.detail.eyebrow")}
                </p>
                <h2
                  className="font-display text-2xl leading-tight font-normal"
                  style={{ letterSpacing: "-0.028em" }}
                >
                  {blog.name}
                </h2>
                <div className="mt-1 h-0.5 w-8 rounded-full bg-gradient-to-r from-primary/60 to-primary/0" />
              </div>
            </div>
          </div>

          {websiteHostname && (
            <a
              className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase transition-colors duration-150 hover:text-primary"
              href={blog.websiteUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-3 shrink-0" />
              <span className="truncate">{websiteHostname}</span>
            </a>
          )}

          {blog.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">{blog.description}</p>
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
            {t("blogs.detail.edit")}
          </Button>
          <Button
            className="cursor-pointer"
            onClick={onDelete}
            size="sm"
            type="button"
            variant="destructive"
          >
            {t("blogs.detail.delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

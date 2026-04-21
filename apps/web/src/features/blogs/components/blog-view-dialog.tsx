import type { BlogViewModel } from "@app/shared";

import { BookOpen, ExternalLink } from "lucide-react";
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
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{blog.name}</DialogTitle>
          <DialogDescription>{blog.description || t("blogs.detail.eyebrow")}</DialogDescription>
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
                <BookOpen aria-hidden className="size-5 text-primary" />
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p
                  aria-hidden
                  className="font-mono text-[10px] tracking-[0.26em] text-muted-foreground uppercase"
                >
                  {t("blogs.detail.eyebrow")}
                </p>
                <p
                  aria-hidden
                  className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-tight font-normal"
                  style={{ letterSpacing: "-0.03em" }}
                >
                  {blog.name}
                </p>
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-border/60" />

          <div className="flex flex-col gap-4 px-7 py-6">
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

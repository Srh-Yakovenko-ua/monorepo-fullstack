import type { BlogViewModel } from "@app/shared";

import { BookOpen, ExternalLink, MoreHorizontal, Plus } from "lucide-react";
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
import { BlogFormDialog } from "@/features/blogs/components/blog-form-dialog";
import { BlogViewDialog } from "@/features/blogs/components/blog-view-dialog";
import { useDeleteBlog } from "@/features/blogs/hooks/use-blog-mutations";
import { useBlogs } from "@/features/blogs/hooks/use-blogs";
import { ModalId, modalObserver } from "@/features/modals";
import { usePageTitle } from "@/hooks/use-page-title";
import { gradientFromString } from "@/lib/gradient-from-string";
import { cn } from "@/lib/utils";

const MAX_PREVIEW = 15;

export function BlogsPage() {
  const { t } = useTranslation();
  usePageTitle(t("blogs.list.title"));
  const { data, error, isError, isLoading } = useBlogs();
  const deleteBlog = useDeleteBlog();
  const [createOpen, setCreateOpen] = useState(false);
  const [editBlog, setEditBlog] = useState<BlogViewModel | null>(null);
  const [viewBlog, setViewBlog] = useState<BlogViewModel | null>(null);

  const blogs = data ? [...data].slice(-MAX_PREVIEW).reverse() : [];

  function openEdit(blog: BlogViewModel) {
    setViewBlog(null);
    setEditBlog(blog);
  }

  function openDeleteConfirm(blog: BlogViewModel) {
    setViewBlog(null);
    modalObserver.addModal(ModalId.Confirm, {
      confirmLabel: t("blogs.detail.deleteModal.confirmLabel"),
      description: t("blogs.detail.deleteModal.description"),
      onConfirm: async () => {
        await deleteBlog.mutateAsync(blog.id);
        toast.success(t("blogs.toasts.deleted"));
      },
      title: t("blogs.detail.deleteModal.title"),
      tone: "destructive",
    });
  }

  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <section className="relative">
        <div className="flex items-center justify-between gap-4">
          <h1
            className={cn(
              "animate-in fill-mode-both fade-in slide-in-from-bottom-3",
              "font-display leading-[0.88] font-normal",
              "text-[clamp(2.5rem,5vw,4.5rem)]",
              "delay-100 duration-700",
            )}
            style={{ letterSpacing: "-0.03em" }}
          >
            {t("blogs.list.title")}
          </h1>
          <Button
            className="shrink-0 gap-1.5 transition-all duration-150 hover:shadow-[var(--shadow-glow-brand)] hover:ring-4 hover:ring-primary/15"
            onClick={() => setCreateOpen(true)}
            size="sm"
          >
            <Plus className="size-3.5" />
            {t("blogs.list.createButton")}
          </Button>
        </div>
        <div className="mt-3 h-px w-full bg-border/60" />
      </section>

      <section className="mt-8">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm"
                key={i}
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
              {t("blogs.list.error")}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {error.message}
            </p>
          </div>
        )}

        {!isLoading && !isError && blogs.length === 0 && (
          <div className="animate-in rounded-2xl border border-border/60 bg-card/70 px-8 py-20 text-center shadow-[var(--shadow-card)] backdrop-blur-md duration-700 fill-mode-both fade-in">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/8">
              <BookOpen className="size-6 text-primary/70" />
            </div>
            <p
              className="font-display text-lg font-normal text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("blogs.list.empty")}
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {t("blogs.list.emptyDescription")}
            </p>
            <Button
              className="mt-6 gap-1.5 transition-all duration-150 hover:ring-4 hover:ring-primary/15"
              onClick={() => setCreateOpen(true)}
              size="sm"
              variant="outline"
            >
              <Plus className="size-3.5" />
              {t("blogs.list.createButton")}
            </Button>
          </div>
        )}

        {!isLoading && !isError && blogs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blogs.map((blog, i) => (
              <BlogCard
                blog={blog}
                index={i}
                key={blog.id}
                onDelete={openDeleteConfirm}
                onEdit={setEditBlog}
                onView={setViewBlog}
              />
            ))}
          </div>
        )}
      </section>

      <BlogFormDialog mode="create" onOpenChange={setCreateOpen} open={createOpen} />

      {editBlog && (
        <BlogFormDialog
          blog={editBlog}
          mode="edit"
          onOpenChange={(open) => {
            if (!open) setEditBlog(null);
          }}
          open={!!editBlog}
        />
      )}

      {viewBlog && (
        <BlogViewDialog
          blog={viewBlog}
          onDelete={() => openDeleteConfirm(viewBlog)}
          onEdit={() => openEdit(viewBlog)}
          onOpenChange={(open) => {
            if (!open) setViewBlog(null);
          }}
          open={!!viewBlog}
        />
      )}
    </main>
  );
}

function BlogCard({
  blog,
  index,
  onDelete,
  onEdit,
  onView,
}: {
  blog: BlogViewModel;
  index: number;
  onDelete: (blog: BlogViewModel) => void;
  onEdit: (blog: BlogViewModel) => void;
  onView: (blog: BlogViewModel) => void;
}) {
  const { t } = useTranslation();

  const hostname = blog.websiteUrl
    ? (() => {
        try {
          return new URL(blog.websiteUrl).hostname;
        } catch {
          return blog.websiteUrl;
        }
      })()
    : null;

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
        onClick={() => onView(blog)}
        type="button"
      >
        <div className="absolute inset-0" style={{ background: gradientFromString(blog.id) }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen className="size-10 text-white/60" />
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CardActionButton aria-label={t("actions.menu")}>
            <MoreHorizontal className="size-4" />
          </CardActionButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem className="cursor-pointer" onSelect={() => onView(blog)}>
            <BookOpen className="mr-2 size-3.5 text-muted-foreground" />
            {t("actions.open")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onSelect={() => onEdit(blog)}>
            <span className="mr-2 size-3.5 text-muted-foreground">✎</span>
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive"
            onSelect={() => onDelete(blog)}
          >
            {t("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-1 flex-col gap-1.5">
          <h2 className="line-clamp-1 text-base leading-snug font-semibold">
            <button
              className="cursor-pointer rounded-sm text-foreground transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
              onClick={() => onView(blog)}
              type="button"
            >
              {blog.name}
            </button>
          </h2>

          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {blog.description}
          </p>
        </div>

        {hostname && (
          <a
            className="flex cursor-pointer items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase transition-colors duration-150 hover:text-primary"
            href={blog.websiteUrl}
            onClick={(e) => e.stopPropagation()}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-3 shrink-0" />
            <span className="truncate">{hostname}</span>
          </a>
        )}
      </div>
    </article>
  );
}

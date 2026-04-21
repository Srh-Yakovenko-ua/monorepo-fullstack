import type { PostViewModel } from "@app/shared";

import { BookOpen, FileText, MoreHorizontal, Plus } from "lucide-react";
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
import { PostFormDialog } from "@/features/posts/components/post-form-dialog";
import { PostViewDialog } from "@/features/posts/components/post-view-dialog";
import { useDeletePost } from "@/features/posts/hooks/use-post-mutations";
import { usePosts } from "@/features/posts/hooks/use-posts";
import { usePageTitle } from "@/hooks/use-page-title";
import { gradientFromString } from "@/lib/gradient-from-string";
import { cn } from "@/lib/utils";

const MAX_PREVIEW = 15;

export function PostsPage() {
  const { t } = useTranslation();
  usePageTitle(t("posts.list.title"));
  const { data, error, isError, isLoading } = usePosts();
  const deletePost = useDeletePost();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPost, setEditPost] = useState<null | PostViewModel>(null);
  const [viewPost, setViewPost] = useState<null | PostViewModel>(null);

  const posts = data ? [...data].slice(-MAX_PREVIEW).reverse() : [];

  function openEdit(post: PostViewModel) {
    setViewPost(null);
    setEditPost(post);
  }

  function openDeleteConfirm(post: PostViewModel) {
    setViewPost(null);
    modalObserver.addModal(ModalId.Confirm, {
      confirmLabel: t("posts.detail.deleteModal.confirmLabel"),
      description: t("posts.detail.deleteModal.description"),
      onConfirm: async () => {
        await deletePost.mutateAsync(post.id);
        toast.success(t("posts.toasts.deleted"));
      },
      title: t("posts.detail.deleteModal.title"),
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
            {t("posts.list.title")}
          </h1>
          <Button
            className="shrink-0 gap-1.5 transition-all duration-150 hover:shadow-[var(--shadow-glow-brand)] hover:ring-4 hover:ring-primary/15"
            onClick={() => setCreateOpen(true)}
            size="sm"
          >
            <Plus className="size-3.5" />
            {t("posts.list.createButton")}
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
              {t("posts.list.error")}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {error.message}
            </p>
          </div>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <div className="animate-in rounded-2xl border border-border/60 bg-card/70 px-8 py-20 text-center shadow-[var(--shadow-card)] backdrop-blur-md duration-700 fill-mode-both fade-in">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/8">
              <FileText className="size-6 text-primary/70" />
            </div>
            <p
              className="font-display text-lg font-normal text-foreground"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("posts.list.empty")}
            </p>
            <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
              {t("posts.list.emptyDescription")}
            </p>
            <Button
              className="mt-6 gap-1.5 transition-all duration-150 hover:ring-4 hover:ring-primary/15"
              onClick={() => setCreateOpen(true)}
              size="sm"
              variant="outline"
            >
              <Plus className="size-3.5" />
              {t("posts.list.createButton")}
            </Button>
          </div>
        )}

        {!isLoading && !isError && posts.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {posts.map((post, i) => (
              <PostCard
                index={i}
                key={post.id}
                onDelete={openDeleteConfirm}
                onEdit={setEditPost}
                onView={setViewPost}
                post={post}
              />
            ))}
          </div>
        )}
      </section>

      <PostFormDialog mode="create" onOpenChange={setCreateOpen} open={createOpen} />

      {editPost && (
        <PostFormDialog
          mode="edit"
          onOpenChange={(open) => {
            if (!open) setEditPost(null);
          }}
          open={!!editPost}
          post={editPost}
        />
      )}

      {viewPost && (
        <PostViewDialog
          onDelete={() => openDeleteConfirm(viewPost)}
          onEdit={() => openEdit(viewPost)}
          onOpenChange={(open) => {
            if (!open) setViewPost(null);
          }}
          open={!!viewPost}
          post={viewPost}
        />
      )}
    </main>
  );
}

function PostCard({
  index,
  onDelete,
  onEdit,
  onView,
  post,
}: {
  index: number;
  onDelete: (post: PostViewModel) => void;
  onEdit: (post: PostViewModel) => void;
  onView: (post: PostViewModel) => void;
  post: PostViewModel;
}) {
  const { t } = useTranslation();

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
        onClick={() => onView(post)}
        type="button"
      >
        <div className="absolute inset-0" style={{ background: gradientFromString(post.blogId) }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileText className="size-10 text-white/60" />
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <CardActionButton aria-label={t("actions.menu")}>
            <MoreHorizontal className="size-4" />
          </CardActionButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          <DropdownMenuItem className="cursor-pointer" onSelect={() => onView(post)}>
            <FileText className="mr-2 size-3.5 text-muted-foreground" />
            {t("actions.open")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onSelect={() => onEdit(post)}>
            <span className="mr-2 size-3.5 text-muted-foreground">✎</span>
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer text-destructive"
            onSelect={() => onDelete(post)}
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
              onClick={() => onView(post)}
              type="button"
            >
              {post.title}
            </button>
          </h2>

          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.shortDescription}
          </p>
        </div>

        {post.blogName && (
          <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            <BookOpen className="size-3 shrink-0" />
            <span className="truncate">{post.blogName}</span>
          </span>
        )}
      </div>
    </article>
  );
}

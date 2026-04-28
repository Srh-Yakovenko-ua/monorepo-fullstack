import type { PostSortField, PostViewModel } from "@app/shared";
import type { Variants } from "motion/react";

import { BookOpen, FileText, MoreHorizontal, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ModalId, modalObserver } from "@/features/modals";
import { PostLikesDisplay } from "@/features/posts/components/post-likes-display";
import { useDeletePost } from "@/features/posts/hooks/use-post-mutations";
import { useInfinitePosts } from "@/features/posts/hooks/use-posts";
import { usePageTitle } from "@/hooks/use-page-title";
import { gradientFromString } from "@/lib/gradient-from-string";

const SORT_VALUES = ["newest", "oldest"] as const;
type SortValue = (typeof SORT_VALUES)[number];

const DEFAULT_SORT: SortValue = "newest";

type SortOption = {
  sortBy: PostSortField;
  sortDirection: "asc" | "desc";
  value: SortValue;
};

const SORT_OPTIONS = [
  { sortBy: "createdAt", sortDirection: "desc", value: "newest" },
  { sortBy: "createdAt", sortDirection: "asc", value: "oldest" },
] satisfies readonly [SortOption, ...SortOption[]];

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants: Variants = {
  exit: { opacity: 0, scale: 0.9 },
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0 },
};

export function PostsPage() {
  const { t } = useTranslation();
  usePageTitle(t("posts.list.title"));

  const [filters, setFilters] = useQueryStates({
    sort: parseAsStringLiteral(SORT_VALUES).withDefault(DEFAULT_SORT),
  });
  const { sort: sortValue } = filters;

  const deletePost = useDeletePost();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const selectedSort = SORT_OPTIONS.find((option) => option.value === sortValue) ?? SORT_OPTIONS[0];

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isFetchNextPageError,
    isLoading,
  } = useInfinitePosts({
    sortBy: selectedSort.sortBy,
    sortDirection: selectedSort.sortDirection,
  });

  const posts =
    data?.pages.flatMap((page) => page.items.map((post, postIndex) => ({ post, postIndex }))) ?? [];

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (intersectionEntries) => {
        if (
          intersectionEntries[0]?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage &&
          !isFetchNextPageError
        ) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isFetchNextPageError]);

  function openDeleteConfirm(post: PostViewModel) {
    modalObserver.addModal(ModalId.Confirm, {
      confirmLabel: t("posts.detail.deleteModal.confirmLabel"),
      description: t("posts.detail.deleteModal.description"),
      onConfirm: async () => {
        try {
          await deletePost.mutateAsync(post.id);
          toast.success(t("posts.toasts.deleted"));
        } catch {
          toast.error(t("posts.toasts.deleteFailed"));
        }
      },
      title: t("posts.detail.deleteModal.title"),
      tone: "destructive",
    });
  }

  function handleOpenCreate() {
    modalObserver.addModal(ModalId.PostForm, { mode: "create" });
  }

  function handleSortChange(value: string) {
    const nextSort = SORT_VALUES.find((availableSort) => availableSort === value);
    if (nextSort) void setFilters({ sort: nextSort });
  }

  function handleSortClear() {
    void setFilters({ sort: DEFAULT_SORT });
  }

  function handleRetryLoadMore() {
    void fetchNextPage();
  }

  function handleEditPost(post: PostViewModel) {
    modalObserver.addModal(ModalId.PostForm, { mode: "edit", post });
  }

  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <div className="flex flex-wrap items-center gap-2 pt-5">
        <Select onValueChange={handleSortChange} value={sortValue}>
          <SelectTrigger
            className="h-8 w-[130px] text-sm"
            isClearable={sortValue !== DEFAULT_SORT}
            onClear={handleSortClear}
          >
            <SelectValue placeholder={t("posts.list.sort.label")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("posts.list.sort.newest")}</SelectItem>
            <SelectItem value="oldest">{t("posts.list.sort.oldest")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button className="shrink-0 gap-1.5" onClick={handleOpenCreate} size="sm">
          <Plus className="size-3.5" />
          {t("posts.list.createButton")}
        </Button>
      </div>

      <section className="mt-5">
        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, skeletonIndex) => (
              <div
                className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm"
                key={`skeleton-loading-${skeletonIndex}`}
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
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-12 text-center backdrop-blur-md"
            initial={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.4 }}
          >
            <p
              className="font-display text-base font-normal text-destructive"
              style={{ letterSpacing: "-0.02em" }}
            >
              {t("posts.list.error")}
            </p>
            <p className="mt-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
              {error.message}
            </p>
          </motion.div>
        )}

        {!isLoading && !isError && posts.length === 0 && (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/60 bg-card/70 px-8 py-20 text-center shadow-[var(--shadow-card)] backdrop-blur-md"
            initial={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.5 }}
          >
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
              onClick={handleOpenCreate}
              size="sm"
              variant="outline"
            >
              <Plus className="size-3.5" />
              {t("posts.list.createButton")}
            </Button>
          </motion.div>
        )}

        {!isLoading && !isError && posts.length > 0 && (
          <motion.div
            animate="visible"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            initial="hidden"
            variants={gridVariants}
          >
            <AnimatePresence mode="popLayout">
              {posts.map(({ post }) => (
                <PostCard
                  key={post.id}
                  onDelete={openDeleteConfirm}
                  onEdit={handleEditPost}
                  post={post}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {isFetchingNextPage && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 2 }).map((_, skeletonIndex) => (
              <div
                className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm"
                key={`skeleton-paging-${skeletonIndex}`}
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

        {isFetchNextPageError && (
          <div className="mt-4 flex items-center justify-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-6 py-4 text-sm text-destructive">
            <span>{t("posts.list.loadMoreFailed")}</span>
            <Button onClick={handleRetryLoadMore} size="sm" variant="outline">
              {t("posts.list.retry")}
            </Button>
          </div>
        )}

        <div className="h-4" ref={sentinelRef} />
      </section>
    </main>
  );
}

function PostCard({
  onDelete,
  onEdit,
  post,
}: {
  onDelete: (post: PostViewModel) => void;
  onEdit: (post: PostViewModel) => void;
  post: PostViewModel;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  function handleNavigateToPost() {
    void navigate(`/posts/${post.id}`);
  }

  function handleEdit() {
    onEdit(post);
  }

  function handleDelete() {
    onDelete(post);
  }

  return (
    <motion.article
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[var(--shadow-card)] backdrop-blur-md hover:border-primary/25 hover:shadow-[var(--shadow-pop)]"
      layout
      transition={{ damping: 28, stiffness: 340, type: "spring" }}
      variants={cardVariants}
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
    >
      <button
        aria-label={t("actions.open")}
        className="relative block h-36 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
        onClick={handleNavigateToPost}
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
          <DropdownMenuItem className="cursor-pointer" onSelect={handleNavigateToPost}>
            <FileText className="mr-2 size-3.5 text-muted-foreground" />
            {t("actions.open")}
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer" onSelect={handleEdit}>
            <span className="mr-2 size-3.5 text-muted-foreground">✎</span>
            {t("actions.edit")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-destructive" onSelect={handleDelete}>
            {t("actions.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-1 flex-col gap-1.5">
          <h2 className="line-clamp-1 text-base leading-snug font-semibold">
            <button
              className="cursor-pointer rounded-sm text-foreground transition-colors duration-150 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none focus-visible:ring-inset"
              onClick={handleNavigateToPost}
              type="button"
            >
              {post.title}
            </button>
          </h2>

          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.shortDescription}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2">
          {post.blogName ? (
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              <BookOpen className="size-3 shrink-0" />
              <span className="truncate">{post.blogName}</span>
            </span>
          ) : (
            <span />
          )}
          <PostLikesDisplay
            dislikesCount={post.extendedLikesInfo.dislikesCount}
            likesCount={post.extendedLikesInfo.likesCount}
          />
        </div>
      </div>
    </motion.article>
  );
}

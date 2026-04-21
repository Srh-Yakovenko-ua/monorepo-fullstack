import type { BlogSortField, BlogViewModel } from "@app/shared";

import { BookOpen, ExternalLink, MoreHorizontal, Plus, Search } from "lucide-react";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
import { useEffect, useRef, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { BlogFormDialog } from "@/features/blogs/components/blog-form-dialog";
import { BlogViewDialog } from "@/features/blogs/components/blog-view-dialog";
import { useDeleteBlog } from "@/features/blogs/hooks/use-blog-mutations";
import { useInfiniteBlogs } from "@/features/blogs/hooks/use-blogs";
import { ModalId, modalObserver } from "@/features/modals";
import { usePageTitle } from "@/hooks/use-page-title";
import { gradientFromString } from "@/lib/gradient-from-string";
import { cn } from "@/lib/utils";

const SORT_VALUES = ["newest", "oldest", "aToZ", "zToA"] as const;
type SortValue = (typeof SORT_VALUES)[number];

const DEFAULT_SORT: SortValue = "newest";

type SortOption = {
  sortBy: BlogSortField;
  sortDirection: "asc" | "desc";
  value: SortValue;
};

const SORT_OPTIONS = [
  { sortBy: "createdAt", sortDirection: "desc", value: "newest" },
  { sortBy: "createdAt", sortDirection: "asc", value: "oldest" },
  { sortBy: "name", sortDirection: "asc", value: "aToZ" },
  { sortBy: "name", sortDirection: "desc", value: "zToA" },
] satisfies readonly [SortOption, ...SortOption[]];

export function BlogsPage() {
  const { t } = useTranslation();
  usePageTitle(t("blogs.list.title"));

  const [filters, setFilters] = useQueryStates({
    q: parseAsString.withDefault(""),
    sort: parseAsStringLiteral(SORT_VALUES).withDefault(DEFAULT_SORT),
  });
  const { q: debouncedSearch, sort: sortValue } = filters;
  const [searchInput, setSearchInput] = useState(debouncedSearch);

  const [createOpen, setCreateOpen] = useState(false);
  const [editBlog, setEditBlog] = useState<BlogViewModel | null>(null);
  const [viewBlog, setViewBlog] = useState<BlogViewModel | null>(null);

  const deleteBlog = useDeleteBlog();
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      void setFilters({ q: searchInput });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, setFilters]);

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
  } = useInfiniteBlogs({
    searchNameTerm: debouncedSearch || undefined,
    sortBy: selectedSort.sortBy,
    sortDirection: selectedSort.sortDirection,
  });

  const blogs =
    data?.pages.flatMap((page) => page.items.map((blog, blogIndex) => ({ blog, blogIndex }))) ?? [];

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
        try {
          await deleteBlog.mutateAsync(blog.id);
          toast.success(t("blogs.toasts.deleted"));
        } catch {
          toast.error(t("blogs.toasts.deleteFailed"));
        }
      },
      title: t("blogs.detail.deleteModal.title"),
      tone: "destructive",
    });
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearchInput(e.target.value);
  }

  function handleSearchClear() {
    setSearchInput("");
  }

  function handleSortChange(value: string) {
    const nextSort = SORT_VALUES.find((availableSort) => availableSort === value);
    if (nextSort) void setFilters({ sort: nextSort });
  }

  function handleSortClear() {
    void setFilters({ sort: DEFAULT_SORT });
  }

  function handleOpenCreate() {
    setCreateOpen(true);
  }

  function handleEditFormOpenChange(open: boolean) {
    if (!open) setEditBlog(null);
  }

  function handleViewOpenChange(open: boolean) {
    if (!open) setViewBlog(null);
  }

  function handleViewDelete() {
    if (viewBlog) openDeleteConfirm(viewBlog);
  }

  function handleViewEdit() {
    if (viewBlog) openEdit(viewBlog);
  }

  function handleRetryLoadMore() {
    void fetchNextPage();
  }

  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <div className="flex flex-wrap items-center gap-2 pt-5">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-sm"
            isClearable
            onChange={handleSearchChange}
            onClear={handleSearchClear}
            placeholder={t("blogs.list.searchPlaceholder")}
            value={searchInput}
          />
        </div>

        <Select onValueChange={handleSortChange} value={sortValue}>
          <SelectTrigger
            className="h-8 w-[130px] text-sm"
            isClearable={sortValue !== DEFAULT_SORT}
            onClear={handleSortClear}
          >
            <SelectValue placeholder={t("blogs.list.sort.label")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">{t("blogs.list.sort.newest")}</SelectItem>
            <SelectItem value="oldest">{t("blogs.list.sort.oldest")}</SelectItem>
            <SelectItem value="aToZ">{t("blogs.list.sort.aToZ")}</SelectItem>
            <SelectItem value="zToA">{t("blogs.list.sort.zToA")}</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button className="shrink-0 gap-1.5" onClick={handleOpenCreate} size="sm">
          <Plus className="size-3.5" />
          {t("blogs.list.createButton")}
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
              {debouncedSearch
                ? t("blogs.list.noResults", { term: debouncedSearch })
                : t("blogs.list.empty")}
            </p>
            {!debouncedSearch && (
              <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                {t("blogs.list.emptyDescription")}
              </p>
            )}
            {!debouncedSearch && (
              <Button
                className="mt-6 gap-1.5 transition-all duration-150 hover:ring-4 hover:ring-primary/15"
                onClick={handleOpenCreate}
                size="sm"
                variant="outline"
              >
                <Plus className="size-3.5" />
                {t("blogs.list.createButton")}
              </Button>
            )}
          </div>
        )}

        {!isLoading && !isError && blogs.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {blogs.map(({ blog, blogIndex }) => (
              <BlogCard
                blog={blog}
                index={Math.min(blogIndex, 6)}
                key={blog.id}
                onDelete={openDeleteConfirm}
                onEdit={setEditBlog}
                onView={setViewBlog}
              />
            ))}
          </div>
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
            <span>{t("blogs.list.loadMoreFailed")}</span>
            <Button onClick={handleRetryLoadMore} size="sm" variant="outline">
              {t("blogs.list.retry")}
            </Button>
          </div>
        )}

        <div className="h-4" ref={sentinelRef} />
      </section>

      <BlogFormDialog mode="create" onOpenChange={setCreateOpen} open={createOpen} />

      {editBlog && (
        <BlogFormDialog
          blog={editBlog}
          mode="edit"
          onOpenChange={handleEditFormOpenChange}
          open={!!editBlog}
        />
      )}

      {viewBlog && (
        <BlogViewDialog
          blog={viewBlog}
          onDelete={handleViewDelete}
          onEdit={handleViewEdit}
          onOpenChange={handleViewOpenChange}
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

  function handleView() {
    onView(blog);
  }

  function handleEdit() {
    onEdit(blog);
  }

  function handleDelete() {
    onDelete(blog);
  }

  function handleLinkClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

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
        onClick={handleView}
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
          <DropdownMenuItem className="cursor-pointer" onSelect={handleView}>
            <BookOpen className="mr-2 size-3.5 text-muted-foreground" />
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
              onClick={handleView}
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
            onClick={handleLinkClick}
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

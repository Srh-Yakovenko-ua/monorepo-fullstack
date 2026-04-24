import { BookOpen, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { CommentsList, NewCommentForm } from "@/features/comments";
import { usePost } from "@/features/posts/hooks/use-post";
import { usePageTitle } from "@/hooks/use-page-title";
import { gradientFromString } from "@/lib/gradient-from-string";

export function PostDetailPage() {
  const { t } = useTranslation();
  const { postId } = useParams<{ postId: string }>();
  const { data: post, isError, isLoading } = usePost(postId ?? "");
  const [newCommentId, setNewCommentId] = useState<null | string>(null);

  usePageTitle(post?.title ?? t("posts.list.title"));

  useEffect(() => {
    if (!newCommentId) return;
    const timer = window.setTimeout(() => setNewCommentId(null), 2300);
    return () => window.clearTimeout(timer);
  }, [newCommentId]);

  function handleCommentCreated(commentId: string) {
    setNewCommentId(commentId);
  }

  if (isLoading) {
    return <PostDetailSkeleton />;
  }

  if (isError || !post) {
    return (
      <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
        <div className="mt-10 animate-in rounded-2xl border border-destructive/20 bg-destructive/5 px-8 py-12 text-center backdrop-blur-md duration-500 fill-mode-both fade-in">
          <p
            className="font-display text-base font-normal text-destructive"
            style={{ letterSpacing: "-0.02em" }}
          >
            {t("posts.detail.notFound")}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <article className="mt-6 animate-in duration-500 fill-mode-both fade-in slide-in-from-bottom-2">
        <div
          className="relative h-48 overflow-hidden rounded-2xl md:h-56"
          style={{ background: gradientFromString(post.blogId) }}
        >
          <div
            aria-hidden
            className="absolute inset-0 flex animate-in items-center justify-center duration-700 fill-mode-both zoom-in-95"
          >
            <FileText className="size-14 text-white/50 transition-transform duration-700 ease-out group-hover:scale-110" />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {post.blogName && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
              <BookOpen aria-hidden className="size-3 shrink-0" />
              {post.blogName}
            </span>
          )}

          <h1
            className="font-display text-[clamp(1.5rem,4vw,2.5rem)] leading-tight font-normal text-foreground"
            style={{ letterSpacing: "-0.03em" }}
          >
            {post.title}
          </h1>

          {post.shortDescription && (
            <p className="text-base leading-relaxed font-medium text-foreground">
              {post.shortDescription}
            </p>
          )}

          {post.content && (
            <p className="text-sm leading-relaxed text-muted-foreground">{post.content}</p>
          )}

          <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
            {t("posts.detail.createdAt")} · {formatPostDate(post.createdAt)}
          </span>
        </div>
      </article>

      <section aria-labelledby="comments-heading" className="mt-10 flex flex-col gap-5">
        <h2
          className="font-display text-lg font-normal text-foreground"
          id="comments-heading"
          style={{ letterSpacing: "-0.02em" }}
        >
          {t("posts.detail.commentsSection")}
        </h2>

        <NewCommentForm onCommentCreated={handleCommentCreated} postId={post.id} />
        <CommentsList newCommentId={newCommentId} postId={post.id} />
      </section>
    </main>
  );
}

const postDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatPostDate(iso: string): string {
  return postDateFormatter.format(new Date(iso));
}

function PostDetailSkeleton() {
  return (
    <main className="relative flex flex-1 flex-col px-5 pb-10 md:px-8 md:pb-14 lg:px-12 lg:pb-16">
      <div className="mt-6">
        <Skeleton className="h-48 rounded-2xl md:h-56" />
        <div className="mt-6 flex flex-col gap-4">
          <Skeleton className="h-3 w-24 rounded-sm" />
          <Skeleton className="h-8 w-3/4 rounded-sm" />
          <Skeleton className="h-4 w-full rounded-sm" />
          <Skeleton className="h-4 w-5/6 rounded-sm" />
          <Skeleton className="h-20 w-full rounded-sm" />
        </div>
      </div>
    </main>
  );
}

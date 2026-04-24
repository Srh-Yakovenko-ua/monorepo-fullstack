import type { Variants } from "motion/react";

import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CommentItem } from "@/features/comments/components/comment-item";
import { usePostComments } from "@/features/comments/hooks/use-post-comments";
import { useUserAuth } from "@/features/user-auth";

type Props = {
  newCommentId?: null | string;
  postId: string;
};

const listVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

export function CommentsList({ newCommentId = null, postId }: Props) {
  const { t } = useTranslation();
  const { user } = useUserAuth();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    usePostComments(postId);

  const comments = data?.pages.flatMap((commentPage) => commentPage.items) ?? [];

  function handleShowMore() {
    void fetchNextPage();
  }

  if (isLoading) {
    return (
      <ul className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, skeletonIndex) => (
          <li
            className="rounded-xl border border-border/50 bg-card/60 px-4 py-3"
            key={`comment-skeleton-${skeletonIndex}`}
          >
            <Skeleton className="mb-2 h-3 w-24 rounded-sm" />
            <Skeleton className="h-3 w-full rounded-sm" />
            <Skeleton className="mt-1.5 h-3 w-3/4 rounded-sm" />
          </li>
        ))}
      </ul>
    );
  }

  if (comments.length === 0) {
    return (
      <p className="py-6 text-center font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
        {t("comments.empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <motion.ul
        animate="visible"
        className="flex flex-col gap-3"
        initial="hidden"
        variants={listVariants}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {comments.map((comment) => (
            <CommentItem
              comment={comment}
              currentUserId={user?.userId ?? null}
              isNew={comment.id === newCommentId}
              key={comment.id}
              postId={postId}
            />
          ))}
        </AnimatePresence>
      </motion.ul>

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            disabled={isFetchingNextPage}
            onClick={handleShowMore}
            size="sm"
            variant="outline"
          >
            {t("comments.showMore")}
          </Button>
        </div>
      )}
    </div>
  );
}

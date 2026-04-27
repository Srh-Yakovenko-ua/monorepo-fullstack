import type { LikesInfoViewModel, LikeStatus } from "@app/shared";

import { LIKE_STATUS } from "@app/shared";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSetCommentLikeStatus } from "@/features/comments/hooks/use-comment-mutations";
import { useUserAuth } from "@/features/user-auth";
import { cn } from "@/lib/utils";

type Props = {
  commentId: string;
  likesInfo: LikesInfoViewModel;
  postId: string;
};

export function CommentLikes({ commentId, likesInfo, postId }: Props) {
  const { t } = useTranslation();
  const { isAuthed } = useUserAuth();
  const setLikeStatus = useSetCommentLikeStatus({ postId });

  const isLiked = likesInfo.myStatus === LIKE_STATUS.Like;
  const isDisliked = likesInfo.myStatus === LIKE_STATUS.Dislike;

  function applyStatus(nextStatus: LikeStatus) {
    if (likesInfo.myStatus === nextStatus) return;
    setLikeStatus.mutate(
      { commentId, likeStatus: nextStatus },
      {
        onError: () => {
          toast.error(t("comments.toasts.likeFailed"));
        },
      },
    );
  }

  function handleLikeClick() {
    applyStatus(isLiked ? LIKE_STATUS.None : LIKE_STATUS.Like);
  }

  function handleDislikeClick() {
    applyStatus(isDisliked ? LIKE_STATUS.None : LIKE_STATUS.Dislike);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label={t("comments.likes.like")}
        aria-pressed={isLiked}
        className={cn("text-muted-foreground", isLiked && "text-primary hover:text-primary")}
        disabled={!isAuthed || setLikeStatus.isPending}
        onClick={handleLikeClick}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ThumbsUp aria-hidden className={cn(isLiked && "fill-current")} />
        <span className="font-mono text-xs tabular-nums">{likesInfo.likesCount}</span>
      </Button>
      <Button
        aria-label={t("comments.likes.dislike")}
        aria-pressed={isDisliked}
        className={cn(
          "text-muted-foreground",
          isDisliked && "text-destructive hover:text-destructive",
        )}
        disabled={!isAuthed || setLikeStatus.isPending}
        onClick={handleDislikeClick}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ThumbsDown aria-hidden className={cn(isDisliked && "fill-current")} />
        <span className="font-mono text-xs tabular-nums">{likesInfo.dislikesCount}</span>
      </Button>
    </div>
  );
}

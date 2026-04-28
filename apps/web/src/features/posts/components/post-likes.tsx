import type { ExtendedLikesInfoViewModel, LikeStatus } from "@app/shared";

import { LIKE_STATUS } from "@app/shared";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSetPostLikeStatus } from "@/features/posts/hooks/use-post-mutations";
import { useUserAuth } from "@/features/user-auth";
import { cn } from "@/lib/utils";

type Props = {
  extendedLikesInfo: ExtendedLikesInfoViewModel;
  postId: string;
};

export function PostLikes({ extendedLikesInfo, postId }: Props) {
  const { t } = useTranslation();
  const { isAuthed } = useUserAuth();
  const setLikeStatus = useSetPostLikeStatus();

  const isLiked = extendedLikesInfo.myStatus === LIKE_STATUS.Like;
  const isDisliked = extendedLikesInfo.myStatus === LIKE_STATUS.Dislike;
  const newestLogins = extendedLikesInfo.newestLikes.map((eachLike) => eachLike.login).join(", ");

  function applyStatus(nextStatus: LikeStatus) {
    if (extendedLikesInfo.myStatus === nextStatus) return;
    setLikeStatus.mutate(
      { likeStatus: nextStatus, postId },
      {
        onError: () => {
          toast.error(t("posts.toasts.likeFailed"));
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
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Button
          aria-label={t("posts.likes.like")}
          aria-pressed={isLiked}
          className={cn("text-muted-foreground", isLiked && "text-primary hover:text-primary")}
          disabled={!isAuthed || setLikeStatus.isPending}
          onClick={handleLikeClick}
          size="sm"
          type="button"
          variant="ghost"
        >
          <ThumbsUp aria-hidden className={cn(isLiked && "fill-current")} />
          <span className="font-mono text-xs tabular-nums">{extendedLikesInfo.likesCount}</span>
        </Button>
        <Button
          aria-label={t("posts.likes.dislike")}
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
          <span className="font-mono text-xs tabular-nums">{extendedLikesInfo.dislikesCount}</span>
        </Button>
      </div>
      {extendedLikesInfo.newestLikes.length > 0 && (
        <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
          {t("posts.likes.newestLikes", { logins: newestLogins })}
        </span>
      )}
    </div>
  );
}

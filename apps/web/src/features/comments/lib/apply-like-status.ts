import type { LikesInfoViewModel, LikeStatus } from "@app/shared";

export function applyLikeStatus({
  likesInfo,
  nextStatus,
}: {
  likesInfo: LikesInfoViewModel;
  nextStatus: LikeStatus;
}): LikesInfoViewModel {
  const previousStatus = likesInfo.myStatus;
  if (previousStatus === nextStatus) return likesInfo;

  const likesDelta = (nextStatus === "Like" ? 1 : 0) - (previousStatus === "Like" ? 1 : 0);
  const dislikesDelta = (nextStatus === "Dislike" ? 1 : 0) - (previousStatus === "Dislike" ? 1 : 0);

  return {
    dislikesCount: likesInfo.dislikesCount + dislikesDelta,
    likesCount: likesInfo.likesCount + likesDelta,
    myStatus: nextStatus,
  };
}

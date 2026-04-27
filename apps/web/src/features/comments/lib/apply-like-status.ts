import type { LikesInfoViewModel, LikeStatus } from "@app/shared";

import { LIKE_STATUS } from "@app/shared";

export function applyLikeStatus({
  likesInfo,
  nextStatus,
}: {
  likesInfo: LikesInfoViewModel;
  nextStatus: LikeStatus;
}): LikesInfoViewModel {
  const previousStatus = likesInfo.myStatus;
  if (previousStatus === nextStatus) return likesInfo;

  const wasLiked = previousStatus === LIKE_STATUS.Like;
  const isLiked = nextStatus === LIKE_STATUS.Like;
  const wasDisliked = previousStatus === LIKE_STATUS.Dislike;
  const isDisliked = nextStatus === LIKE_STATUS.Dislike;

  return {
    dislikesCount: likesInfo.dislikesCount + Number(isDisliked) - Number(wasDisliked),
    likesCount: likesInfo.likesCount + Number(isLiked) - Number(wasLiked),
    myStatus: nextStatus,
  };
}

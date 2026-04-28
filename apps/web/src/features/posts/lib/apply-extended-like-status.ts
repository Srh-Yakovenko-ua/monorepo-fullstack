import type { ExtendedLikesInfoViewModel, LikeStatus } from "@app/shared";

import { LIKE_STATUS } from "@app/shared";

export function applyExtendedLikeStatus({
  extendedLikesInfo,
  nextStatus,
}: {
  extendedLikesInfo: ExtendedLikesInfoViewModel;
  nextStatus: LikeStatus;
}): ExtendedLikesInfoViewModel {
  const previousStatus = extendedLikesInfo.myStatus;
  if (previousStatus === nextStatus) return extendedLikesInfo;

  const wasLiked = previousStatus === LIKE_STATUS.Like;
  const isLiked = nextStatus === LIKE_STATUS.Like;
  const wasDisliked = previousStatus === LIKE_STATUS.Dislike;
  const isDisliked = nextStatus === LIKE_STATUS.Dislike;

  return {
    ...extendedLikesInfo,
    dislikesCount: extendedLikesInfo.dislikesCount + Number(isDisliked) - Number(wasDisliked),
    likesCount: extendedLikesInfo.likesCount + Number(isLiked) - Number(wasLiked),
    myStatus: nextStatus,
  };
}

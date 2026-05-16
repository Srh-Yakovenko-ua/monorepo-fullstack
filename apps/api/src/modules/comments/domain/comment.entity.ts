export interface CommentDoc {
  commentatorUserId: number;
  commentatorUserLogin: string;
  content: string;
  createdAt: Date;
  dislikesCount: number;
  id: number;
  likesCount: number;
  postId: number;
}

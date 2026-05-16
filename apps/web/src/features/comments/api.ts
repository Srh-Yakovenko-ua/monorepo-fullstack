import type { CommentViewModel, LikeInput, Paginator } from "@app/shared";

import { request } from "@/lib/http-client";

export const commentsKeys = {
  postComments: (postId: number) => ["comments", "post", postId] as const,
};

export const commentsApi = {
  create: ({ content, postId }: { content: string; postId: number }) =>
    request<CommentViewModel>(`/api/posts/${postId}/comments`, {
      body: JSON.stringify({ content }),
      method: "POST",
    }),
  listByPost: ({
    pageNumber,
    pageSize,
    postId,
  }: {
    pageNumber: number;
    pageSize: number;
    postId: number;
  }) => {
    const url = new URL(`/api/posts/${postId}/comments`, window.location.origin);
    url.searchParams.set("pageNumber", String(pageNumber));
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("sortBy", "createdAt");
    url.searchParams.set("sortDirection", "desc");
    return request<Paginator<CommentViewModel>>(url.pathname + url.search);
  },
  remove: (commentId: number) => request<void>(`/api/comments/${commentId}`, { method: "DELETE" }),
  setLikeStatus: ({ commentId, likeStatus }: LikeInput & { commentId: number }) =>
    request<void>(`/api/comments/${commentId}/like-status`, {
      body: JSON.stringify({ likeStatus }),
      method: "PUT",
    }),
  update: ({ commentId, content }: { commentId: number; content: string }) =>
    request<void>(`/api/comments/${commentId}`, {
      body: JSON.stringify({ content }),
      method: "PUT",
    }),
};

import type { CommentViewModel, LikeInput, Paginator } from "@app/shared";

import { request } from "@/lib/http-client";

export const commentsKeys = {
  postComments: (postId: string) => ["comments", "post", postId] as const,
};

export const commentsApi = {
  create: ({ content, postId }: { content: string; postId: string }) =>
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
    postId: string;
  }) => {
    const url = new URL(`/api/posts/${postId}/comments`, window.location.origin);
    url.searchParams.set("pageNumber", String(pageNumber));
    url.searchParams.set("pageSize", String(pageSize));
    url.searchParams.set("sortBy", "createdAt");
    url.searchParams.set("sortDirection", "desc");
    return request<Paginator<CommentViewModel>>(url.pathname + url.search);
  },
  remove: (commentId: string) => request<void>(`/api/comments/${commentId}`, { method: "DELETE" }),
  setLikeStatus: ({ commentId, likeStatus }: LikeInput & { commentId: string }) =>
    request<void>(`/api/comments/${commentId}/like-status`, {
      body: JSON.stringify({ likeStatus }),
      method: "PUT",
    }),
  update: ({ commentId, content }: { commentId: string; content: string }) =>
    request<void>(`/api/comments/${commentId}`, {
      body: JSON.stringify({ content }),
      method: "PUT",
    }),
};

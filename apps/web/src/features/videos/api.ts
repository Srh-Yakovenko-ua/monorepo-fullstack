import type { CreateVideoInput, UpdateVideoInput, VideoViewModel } from "@app/shared";

import { request } from "@/lib/http-client";

export const videosKeys = {
  all: ["videos"] as const,
  lists: () => [...videosKeys.all, "list"] as const,
};

export const videosApi = {
  create: (input: CreateVideoInput) =>
    request<VideoViewModel>("/api/videos", {
      body: JSON.stringify(input),
      method: "POST",
    }),
  list: () => request<VideoViewModel[]>("/api/videos"),
  remove: (id: number) => request<void>(`/api/videos/${id}`, { method: "DELETE" }),
  update: (id: number, input: UpdateVideoInput) =>
    request<void>(`/api/videos/${id}`, {
      body: JSON.stringify(input),
      method: "PUT",
    }),
};

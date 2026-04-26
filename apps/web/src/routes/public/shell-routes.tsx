import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const publicShellRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(() => import("@/features/blogs/pages/blogs-page"), "BlogsPage"),
    path: ROUTES.BLOGS,
  },
  {
    lazy: lazyComponent(() => import("@/features/posts/pages/posts-page"), "PostsPage"),
    path: ROUTES.POSTS,
  },
  {
    lazy: lazyComponent(() => import("@/features/posts/pages/post-detail-page"), "PostDetailPage"),
    path: ROUTES.POST_DETAIL,
  },
  {
    lazy: lazyComponent(() => import("@/features/videos/pages/videos-page"), "VideosPage"),
    path: ROUTES.VIDEOS,
  },
];

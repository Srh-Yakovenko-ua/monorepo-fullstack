import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const postsRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(() => import("@/features/posts/pages/posts-page"), "PostsPage"),
    path: ROUTES.POSTS,
  },
  {
    lazy: lazyComponent(() => import("@/features/posts/pages/post-detail-page"), "PostDetailPage"),
    path: ROUTES.POST_DETAIL,
  },
];

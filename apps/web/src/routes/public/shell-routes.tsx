import type { RouteObject } from "react-router";

import { blogsRoutes } from "@/features/blogs/routes";
import { postsRoutes } from "@/features/posts/routes";
import { videosRoutes } from "@/features/videos/routes";

export const publicShellRoutes: RouteObject[] = [...blogsRoutes, ...postsRoutes, ...videosRoutes];

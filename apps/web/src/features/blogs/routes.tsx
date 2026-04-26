import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const blogsRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(() => import("@/features/blogs/pages/blogs-page"), "BlogsPage"),
    path: ROUTES.BLOGS,
  },
];

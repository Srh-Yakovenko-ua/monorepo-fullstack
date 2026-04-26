import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const videosRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(() => import("@/features/videos/pages/videos-page"), "VideosPage"),
    path: ROUTES.VIDEOS,
  },
];

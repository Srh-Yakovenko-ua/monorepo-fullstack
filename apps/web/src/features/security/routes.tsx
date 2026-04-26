import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const securityRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(() => import("@/features/security/pages/devices-page"), "DevicesPage"),
    path: ROUTES.DEVICES,
  },
];

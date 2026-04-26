import type { RouteObject } from "react-router";

import { RequireAuth } from "@/features/user-auth";
import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const authProtectedRoutes: RouteObject[] = [
  {
    children: [
      {
        lazy: lazyComponent(() => import("@/features/security/pages/devices-page"), "DevicesPage"),
        path: ROUTES.DEVICES,
      },
    ],
    element: <RequireAuth />,
  },
];

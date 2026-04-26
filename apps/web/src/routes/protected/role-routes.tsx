import type { RouteObject } from "react-router";

import { ROLE } from "@app/shared";

import { RequireRole } from "@/features/user-auth";
import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const roleProtectedRoutes: RouteObject[] = [
  {
    children: [
      {
        lazy: lazyComponent(() => import("@/features/users/pages/users-page"), "UsersPage"),
        path: ROUTES.USERS,
      },
    ],
    element: <RequireRole allow={[ROLE.admin, ROLE.superAdmin]} />,
  },
];

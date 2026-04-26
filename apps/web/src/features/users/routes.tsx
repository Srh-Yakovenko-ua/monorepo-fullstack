import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const usersRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(() => import("@/features/users/pages/users-page"), "UsersPage"),
    path: ROUTES.USERS,
  },
];

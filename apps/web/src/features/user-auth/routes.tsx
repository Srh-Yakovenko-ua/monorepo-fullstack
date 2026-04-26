import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const userAuthRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(
      () => import("@/features/user-auth/components/login-page"),
      "UserLoginPage",
    ),
    path: ROUTES.LOGIN,
  },
];

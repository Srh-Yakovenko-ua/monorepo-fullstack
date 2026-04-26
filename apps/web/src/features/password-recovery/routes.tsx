import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const passwordRecoveryRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(() => import("@/features/password-recovery"), "PasswordRecoveryPage"),
    path: ROUTES.PASSWORD_RECOVERY,
  },
];

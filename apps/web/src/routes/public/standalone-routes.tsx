import type { RouteObject } from "react-router";

import { passwordRecoveryRoutes } from "@/features/password-recovery/routes";
import { registrationRoutes } from "@/features/registration/routes";
import { userAuthRoutes } from "@/features/user-auth/routes";

export const publicStandaloneRoutes: RouteObject[] = [
  ...userAuthRoutes,
  ...registrationRoutes,
  ...passwordRecoveryRoutes,
];

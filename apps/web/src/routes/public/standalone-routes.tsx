import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const publicStandaloneRoutes: RouteObject[] = [
  {
    lazy: lazyComponent(
      () => import("@/features/user-auth/components/login-page"),
      "UserLoginPage",
    ),
    path: ROUTES.LOGIN,
  },
  {
    lazy: lazyComponent(
      () => import("@/features/registration/components/signup-page"),
      "SignupPage",
    ),
    path: ROUTES.SIGNUP,
  },
  {
    lazy: lazyComponent(
      () => import("@/features/registration/components/confirm-registration-page"),
      "ConfirmRegistrationPage",
    ),
    path: ROUTES.CONFIRM_REGISTRATION,
  },
  {
    lazy: lazyComponent(() => import("@/features/password-recovery"), "PasswordRecoveryPage"),
    path: ROUTES.PASSWORD_RECOVERY,
  },
];

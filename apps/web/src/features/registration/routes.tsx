import type { RouteObject } from "react-router";

import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";

export const registrationRoutes: RouteObject[] = [
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
];

import type { RouteObject } from "react-router";

import { ROLE } from "@app/shared";

import { RequireRole } from "@/features/user-auth";
import { usersRoutes } from "@/features/users/routes";

export const roleProtectedRoutes: RouteObject[] = [
  {
    children: [...usersRoutes],
    element: <RequireRole allow={[ROLE.admin, ROLE.superAdmin]} />,
  },
];

import type { RouteObject } from "react-router";

import { securityRoutes } from "@/features/security/routes";
import { RequireAuth } from "@/features/user-auth";

export const authProtectedRoutes: RouteObject[] = [
  {
    children: [...securityRoutes],
    element: <RequireAuth />,
  },
];

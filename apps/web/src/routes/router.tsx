import type { RouteObject } from "react-router";

import { createBrowserRouter, Navigate } from "react-router";

import { AppErrorBoundary } from "@/routes/error-boundary";
import { AppShell } from "@/routes/layouts/app-shell";
import { RootLayout } from "@/routes/layouts/root-layout";
import { lazyComponent } from "@/routes/lazy";
import { ROUTES } from "@/routes/paths";
import { authProtectedRoutes } from "@/routes/protected/auth-routes";
import { roleProtectedRoutes } from "@/routes/protected/role-routes";
import { publicShellRoutes } from "@/routes/public/shell-routes";
import { publicStandaloneRoutes } from "@/routes/public/standalone-routes";

const indexRedirect: RouteObject = {
  element: <Navigate replace to={ROUTES.BLOGS} />,
  index: true,
};

const notFoundRoute: RouteObject = {
  lazy: lazyComponent(() => import("@/routes/not-found-page"), "NotFoundPage"),
  path: ROUTES.NOT_FOUND,
};

const publicShellChildren: RouteObject[] = [indexRedirect, ...publicShellRoutes, notFoundRoute];
const protectedShellChildren: RouteObject[] = [...authProtectedRoutes, ...roleProtectedRoutes];

const appShellRoute: RouteObject = {
  children: [...publicShellChildren, ...protectedShellChildren],
  element: <AppShell />,
  errorElement: <AppErrorBoundary />,
  path: ROUTES.ROOT,
};

export const router = createBrowserRouter([
  {
    children: [appShellRoute, ...publicStandaloneRoutes],
    element: <RootLayout />,
  },
]);

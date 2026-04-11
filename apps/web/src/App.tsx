import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { PageLoading } from "@/components/page-loading";
import { ModalsRoot } from "@/features/modals";
import { AppErrorBoundary } from "@/routes/error-boundary";
import { AppShell } from "@/routes/layouts/app-shell";

const HealthPage = lazy(() => import("@/features/health").then((m) => ({ default: m.HealthPage })));

const NotFoundPage = lazy(() =>
  import("@/routes/not-found-page").then((m) => ({ default: m.NotFoundPage })),
);

function lazyRoute(Component: React.LazyExoticComponent<React.ComponentType>) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  );
}

const router = createBrowserRouter([
  {
    children: [
      { element: lazyRoute(HealthPage), index: true },
      { element: lazyRoute(NotFoundPage), path: "*" },
    ],
    element: <AppShell />,
    errorElement: <AppErrorBoundary />,
    path: "/",
  },
]);

export function App() {
  return (
    <>
      <RouterProvider router={router} />
      <ModalsRoot />
    </>
  );
}

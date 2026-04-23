import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";

import { ListPageSkeleton } from "@/components/list-page-skeleton";
import { PageLoading } from "@/components/page-loading";
import { AdminLoginPage, RequireAdminAuth } from "@/features/admin-auth";
import { ModalsRoot } from "@/features/modals";
import { AppErrorBoundary } from "@/routes/error-boundary";
import { AppShell } from "@/routes/layouts/app-shell";

const HealthPage = lazy(() => import("@/features/health").then((m) => ({ default: m.HealthPage })));

const BlogsPage = lazy(() => import("@/features/blogs").then((m) => ({ default: m.BlogsPage })));

const PostsPage = lazy(() => import("@/features/posts").then((m) => ({ default: m.PostsPage })));

const VideosPage = lazy(() => import("@/features/videos").then((m) => ({ default: m.VideosPage })));

const UsersPage = lazy(() => import("@/features/users").then((m) => ({ default: m.UsersPage })));

const NotFoundPage = lazy(() =>
  import("@/routes/not-found-page").then((m) => ({ default: m.NotFoundPage })),
);

function lazyRoute(
  Component: React.LazyExoticComponent<React.ComponentType>,
  fallback: React.ReactNode = <PageLoading />,
) {
  return <Suspense fallback={fallback}>{<Component />}</Suspense>;
}

const router = createBrowserRouter([
  {
    children: [
      { element: lazyRoute(HealthPage), index: true },
      { element: lazyRoute(BlogsPage, <ListPageSkeleton />), path: "blogs" },
      { element: lazyRoute(PostsPage, <ListPageSkeleton />), path: "posts" },
      { element: lazyRoute(VideosPage, <ListPageSkeleton />), path: "videos" },
      {
        element: <RequireAdminAuth>{lazyRoute(UsersPage, <ListPageSkeleton />)}</RequireAdminAuth>,
        path: "users",
      },
      { element: lazyRoute(NotFoundPage), path: "*" },
    ],
    element: <AppShell />,
    errorElement: <AppErrorBoundary />,
    path: "/",
  },
  {
    element: <AdminLoginPage />,
    path: "admin/login",
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

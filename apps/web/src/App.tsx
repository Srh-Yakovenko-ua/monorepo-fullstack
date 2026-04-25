import { ROLE } from "@app/shared";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router";

import { ModalsRoot } from "@/features/modals";
import { RequireRole } from "@/features/user-auth";
import { AppErrorBoundary } from "@/routes/error-boundary";
import { AppShell } from "@/routes/layouts/app-shell";
import { RootLayout } from "@/routes/layouts/root-layout";

const router = createBrowserRouter([
  {
    children: [
      {
        children: [
          {
            element: <Navigate replace to="/blogs" />,
            index: true,
          },
          {
            lazy: async () => {
              const { BlogsPage } = await import("@/features/blogs/pages/blogs-page");
              return { Component: BlogsPage };
            },
            path: "blogs",
          },
          {
            lazy: async () => {
              const { PostsPage } = await import("@/features/posts/pages/posts-page");
              return { Component: PostsPage };
            },
            path: "posts",
          },
          {
            lazy: async () => {
              const { PostDetailPage } = await import("@/features/posts/pages/post-detail-page");
              return { Component: PostDetailPage };
            },
            path: "posts/:postId",
          },
          {
            lazy: async () => {
              const { VideosPage } = await import("@/features/videos/pages/videos-page");
              return { Component: VideosPage };
            },
            path: "videos",
          },
          {
            lazy: async () => {
              const { UsersPage } = await import("@/features/users/pages/users-page");
              return {
                Component: function UsersRoute() {
                  return (
                    <RequireRole allow={[ROLE.admin, ROLE.superAdmin]}>
                      <UsersPage />
                    </RequireRole>
                  );
                },
              };
            },
            path: "users",
          },
          {
            lazy: async () => {
              const { NotFoundPage } = await import("@/routes/not-found-page");
              return { Component: NotFoundPage };
            },
            path: "*",
          },
        ],
        element: <AppShell />,
        errorElement: <AppErrorBoundary />,
        path: "/",
      },
      {
        lazy: async () => {
          const { UserLoginPage } = await import("@/features/user-auth/components/login-page");
          return { Component: UserLoginPage };
        },
        path: "login",
      },
      {
        lazy: async () => {
          const { SignupPage } = await import("@/features/registration/components/signup-page");
          return { Component: SignupPage };
        },
        path: "signup",
      },
      {
        lazy: async () => {
          const { ConfirmRegistrationPage } =
            await import("@/features/registration/components/confirm-registration-page");
          return { Component: ConfirmRegistrationPage };
        },
        path: "confirm-registration",
      },
    ],
    element: <RootLayout />,
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

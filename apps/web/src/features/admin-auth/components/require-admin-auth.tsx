import type { ReactNode } from "react";

import { Navigate, useLocation } from "react-router";

import { useAdminAuthStore } from "@/features/admin-auth/store/admin-auth-store";

type RequireAdminAuthProps = {
  children: ReactNode;
};

export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const isAuthed = useAdminAuthStore((state) => state.isAuthed);
  const location = useLocation();

  if (!isAuthed) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate replace to={`/admin/login?next=${next}`} />;
  }

  return <>{children}</>;
}

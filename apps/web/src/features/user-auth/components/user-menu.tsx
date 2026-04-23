import { LogIn, LogOut, User } from "lucide-react";
import { NavLink, useNavigate } from "react-router";

import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";

export function UserMenu() {
  const { isAuthed, signOut, user } = useUserAuth();
  const navigate = useNavigate();

  function handleSignOut() {
    signOut();
    void navigate("/login");
  }

  if (!isAuthed) {
    return (
      <NavLink
        aria-label="Sign in"
        className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        title="Sign in"
        to="/login"
      >
        <LogIn className="size-4" />
      </NavLink>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <div
        className="flex size-8 items-center justify-center rounded-md text-muted-foreground"
        title={user?.login}
      >
        <User className="size-4" />
      </div>
      <button
        aria-label="Sign out user"
        className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        onClick={handleSignOut}
        title={`Sign out ${user?.login ?? ""}`}
        type="button"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}

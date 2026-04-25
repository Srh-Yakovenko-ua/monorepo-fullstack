import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/features/user-auth/components/role-badge";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";

export function UserMenu() {
  const { isAuthed, signOut, user } = useUserAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!isAuthed || !user) {
    return (
      <Button
        asChild
        className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
        size="icon"
        variant="ghost"
      >
        <NavLink aria-label="Sign in" title="Sign in" to="/login">
          <LogIn />
        </NavLink>
      </Button>
    );
  }

  async function handleConfirm() {
    setIsSigningOut(true);
    try {
      await signOut();
      void navigate("/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  function handleCancel() {
    setIsOpen(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      <RoleBadge
        className="px-1.5 py-0 text-[10px] transition-opacity duration-200 group-data-[state=collapsed]:hidden group-data-[state=collapsed]:opacity-0"
        role={user.role}
      />
      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogTrigger asChild>
          <Button
            aria-label="Sign out user"
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            size="icon"
            title={`Sign out ${user.login}`}
            variant="ghost"
          >
            <LogOut />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Log out</AlertDialogTitle>
            <AlertDialogDescription>
              Are you really want to log out of your account {user.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut} onClick={handleCancel}>
              No
            </AlertDialogCancel>
            <AlertDialogAction disabled={isSigningOut} onClick={handleConfirm}>
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

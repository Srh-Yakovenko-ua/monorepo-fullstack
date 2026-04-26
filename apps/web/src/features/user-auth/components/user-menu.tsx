import { LogIn, LogOut, MonitorSmartphone, Settings } from "lucide-react";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
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
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RoleBadge } from "@/features/user-auth/components/role-badge";
import { useUserAuth } from "@/features/user-auth/hooks/use-user-auth";

export function UserMenu() {
  const { isAuthed, signOut, user } = useUserAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const shouldPreventReturnFocusRef = useRef(false);

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

  function handleActiveDevicesSelect() {
    void navigate("/devices");
  }

  function handleSignOutSelect() {
    shouldPreventReturnFocusRef.current = true;
    setIsSignOutDialogOpen(true);
  }

  function handleSignOutConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsSigningOut(true);
    signOut()
      .then(() => navigate("/login"))
      .finally(() => {
        setIsSigningOut(false);
        setIsSignOutDialogOpen(false);
      });
  }

  function handleSignOutDialogOpenChange(open: boolean) {
    setIsSignOutDialogOpen(open);
  }

  function handleDropdownCloseAutoFocus(event: Event) {
    if (shouldPreventReturnFocusRef.current) {
      event.preventDefault();
      shouldPreventReturnFocusRef.current = false;
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      <RoleBadge
        className="px-1.5 py-0 text-[10px] transition-opacity duration-200 group-data-[state=collapsed]:hidden group-data-[state=collapsed]:opacity-0"
        role={user.role}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={t("userMenu.openLabel")}
            className="text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            size="icon"
            variant="ghost"
          >
            <Settings />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[11rem]"
          onCloseAutoFocus={handleDropdownCloseAutoFocus}
        >
          <DropdownMenuItem onSelect={handleActiveDevicesSelect}>
            <MonitorSmartphone className="mr-2 h-4 w-4" />
            {t("userMenu.activeDevices")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleSignOutSelect}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {t("userMenu.signOut")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog onOpenChange={handleSignOutDialogOpenChange} open={isSignOutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("userMenu.signOutConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("userMenu.signOutConfirm.description", { email: user.email })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSigningOut}>
              {t("userMenu.signOutConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction disabled={isSigningOut} onClick={handleSignOutConfirm}>
              {t("userMenu.signOutConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

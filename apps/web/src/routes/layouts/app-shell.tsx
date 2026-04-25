import { ROLE } from "@app/shared";
import { BookOpen, FileText, Layers, Users, Video } from "lucide-react";
import { motion } from "motion/react";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router";

import { LocalePicker } from "@/components/locale-picker";
import { ThemePicker } from "@/components/theme-picker";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { usePost } from "@/features/posts/hooks/use-post";
import { UserMenu, useUserAuth } from "@/features/user-auth";
import { cn } from "@/lib/utils";

type NavItem = {
  icon: React.ElementType;
  key: "blogs" | "posts" | "users" | "videos";
  to: string;
};

const BASE_NAV_ITEMS: NavItem[] = [
  { icon: BookOpen, key: "blogs", to: "/blogs" },
  { icon: FileText, key: "posts", to: "/posts" },
  { icon: Video, key: "videos", to: "/videos" },
];

const ADMIN_NAV_ITEM: NavItem = { icon: Users, key: "users", to: "/users" };

export function AppShell() {
  return (
    <NuqsAdapter>
      <SidebarProvider>
        <AppSidebar />
        <ContentArea />
      </SidebarProvider>
    </NuqsAdapter>
  );
}

function AppSidebar() {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const { user } = useUserAuth();
  const collapsed = state === "collapsed";

  const isAdminOrSuperAdmin = user?.role === ROLE.admin || user?.role === ROLE.superAdmin;

  const navItems = isAdminOrSuperAdmin ? [...BASE_NAV_ITEMS, ADMIN_NAV_ITEM] : BASE_NAV_ITEMS;

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarHeader className="px-4 py-5">
        <div
          className={cn(
            "flex items-center gap-3 transition-all duration-200",
            collapsed && "justify-center gap-0",
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 shadow-[var(--shadow-soft)]">
            <Layers className="size-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-display text-[15px] font-semibold tracking-tight text-foreground">
              {t("appShell.label")}
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map(({ icon: Icon, key, to }) => (
                <SidebarMenuItem key={key}>
                  <NavLink end={to === "/"} to={to}>
                    {({ isActive }) => (
                      <SidebarMenuButton
                        className={cn(
                          "relative cursor-pointer gap-3 transition-all duration-150",
                          isActive
                            ? "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
                            : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                        )}
                        isActive={isActive}
                        tooltip={t(`nav.${key}`)}
                      >
                        <Icon
                          className={cn(
                            "size-[18px] shrink-0 transition-colors duration-150",
                            isActive ? "text-primary" : "text-muted-foreground/70",
                          )}
                        />
                        <span className="font-mono text-[11px] tracking-[0.14em] uppercase">
                          {t(`nav.${key}`)}
                        </span>
                        {isActive && (
                          <motion.div
                            className="absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
                            layoutId="sidebar-active-indicator"
                            transition={{ damping: 34, stiffness: 420, type: "spring" }}
                          />
                        )}
                      </SidebarMenuButton>
                    )}
                  </NavLink>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 px-3 py-3">
        <div className="flex items-center justify-between gap-2 group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:justify-center">
          <SidebarTrigger className="size-8 cursor-pointer text-muted-foreground transition-colors duration-150 hover:text-foreground" />
          <UserMenu />
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

function ContentArea() {
  return (
    <div className="relative flex min-h-screen flex-1 flex-col overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 15% 0%, oklch(from var(--primary) l c h / 0.07), transparent 60%),
            radial-gradient(ellipse 50% 60% at 92% 95%, oklch(from var(--info) l c h / 0.05), transparent 55%)
          `,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.018]"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <header className="sticky top-0 z-30 flex h-[var(--shell-header-height)] shrink-0 items-center gap-4 border-b border-border/50 bg-background/80 px-4 backdrop-blur-xl backdrop-saturate-150">
        <div className="min-w-0 flex-1">
          <PageBreadcrumbs />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ThemePicker />
          <LocalePicker />
        </div>
      </header>
      <div className="relative z-10 flex flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}

function PageBreadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();

  const segments = location.pathname.split("/").filter(Boolean);

  const first = segments[0] ?? "";
  const second = segments[1];
  const sectionLabel =
    first === "blogs"
      ? t("breadcrumbs.blogs")
      : first === "posts"
        ? t("breadcrumbs.posts")
        : first === "videos"
          ? t("breadcrumbs.videos")
          : t("breadcrumbs.users");

  const sectionTo = `/${first}`;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          {second ? (
            <BreadcrumbLink
              asChild
              className="cursor-pointer font-mono text-[11px] tracking-[0.14em] uppercase transition-colors hover:text-foreground"
            >
              <NavLink to={sectionTo}>{sectionLabel}</NavLink>
            </BreadcrumbLink>
          ) : (
            <BreadcrumbPage className="font-mono text-[11px] tracking-[0.14em] uppercase">
              {sectionLabel}
            </BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {second && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="max-w-[260px] truncate font-mono text-[11px] tracking-[0.14em] uppercase">
                {first === "posts" ? (
                  <PostBreadcrumbTitle fallback={second} postId={second} />
                ) : (
                  second
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

function PostBreadcrumbTitle({ fallback, postId }: { fallback: string; postId: string }) {
  const { data: post } = usePost(postId);
  return <>{post?.title ?? fallback}</>;
}

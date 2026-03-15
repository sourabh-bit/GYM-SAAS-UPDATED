import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dumbbell, LayoutDashboard, Users, CreditCard, CalendarCheck,
  BarChart3, Settings, LogOut, UserCog, Bell, ChevronRight, Zap, ChevronsRight
} from "lucide-react";
import { motion } from "framer-motion";
import NotificationPanel from "./NotificationPanel";
import { useUnreadCount, useAutoGenerateNotifications } from "@/hooks/useNotifications";
import { useGymAccess } from "@/hooks/useGymAccess";
import {
  getDemoOwnerPage,
  getOwnerPathFromDemoPage,
  isDemoGymModeFromLocation,
  toDemoOwnerPath,
} from "@/lib/demoMode";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Users, label: "Members", path: "/dashboard/members" },
  { icon: CalendarCheck, label: "Attendance", path: "/dashboard/attendance" },
  { icon: UserCog, label: "Trainers", path: "/dashboard/trainers" },
  { icon: CreditCard, label: "Plans", path: "/dashboard/subscriptions" },
  { icon: BarChart3, label: "Reports", path: "/dashboard/reports" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

// Mobile bottom nav: horizontally scrollable with all sections
const mobileNavItems = [
  { icon: LayoutDashboard, label: "Home", path: "/dashboard" },
  { icon: Users, label: "Members", path: "/dashboard/members" },
  { icon: CalendarCheck, label: "Attendance", path: "/dashboard/attendance" },
  { icon: UserCog, label: "Trainers", path: "/dashboard/trainers" },
  { icon: CreditCard, label: "Plans", path: "/dashboard/subscriptions" },
  { icon: BarChart3, label: "Reports", path: "/dashboard/reports" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

const MOBILE_NAV_SCROLL_KEY = "fitcore.mobile_nav.scroll_left";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  hideHero?: boolean;
}

interface HeroTheme {
  container: string;
  orbPrimary: string;
  orbSecondary: string;
  kicker: string;
}

const resolveOwnerHeroTheme = (ownerPath: string, title: string): HeroTheme => {
  const lowerTitle = title.toLowerCase();
  const isDashboard = ownerPath === "/dashboard" || lowerTitle.includes("dashboard");
  const isMembers = ownerPath.startsWith("/dashboard/members") || lowerTitle.includes("member");
  const isTrainers = ownerPath.startsWith("/dashboard/trainers") || lowerTitle.includes("trainer");
  const isSubscriptions = ownerPath.startsWith("/dashboard/subscriptions") || lowerTitle.includes("subscription");
  const isAttendance = ownerPath.startsWith("/dashboard/attendance") || lowerTitle.includes("attendance");
  const isReports = ownerPath.startsWith("/dashboard/reports") || lowerTitle.includes("report");
  const isSettings = ownerPath.startsWith("/dashboard/settings") || lowerTitle.includes("setting");

  if (isDashboard) {
    return {
      container:
        "border-blue-400/25 bg-[radial-gradient(120%_140%_at_100%_0%,rgb(59_130_246/0.28)_0%,hsl(var(--card))_50%,hsl(var(--card))_100%)]",
      orbPrimary: "bg-blue-400/25",
      orbSecondary: "bg-sky-400/12",
      kicker: "text-blue-200/90",
    };
  }

  if (isMembers) {
    return {
      container:
        "border-teal-400/30 bg-[radial-gradient(120%_140%_at_100%_0%,rgb(20_184_166/0.3)_0%,hsl(var(--card))_50%,hsl(var(--card))_100%)]",
      orbPrimary: "bg-teal-400/24",
      orbSecondary: "bg-cyan-400/14",
      kicker: "text-teal-200/95",
    };
  }

  if (isTrainers) {
    return {
      container:
        "border-emerald-400/25 bg-[radial-gradient(120%_140%_at_100%_0%,hsl(var(--glow-green)/0.2)_0%,hsl(var(--card))_48%,hsl(var(--card))_100%)]",
      orbPrimary: "bg-emerald-400/20",
      orbSecondary: "bg-primary/10",
      kicker: "text-emerald-300/90",
    };
  }

  if (isSubscriptions) {
    return {
      container:
        "border-amber-400/25 bg-[radial-gradient(120%_140%_at_100%_0%,hsl(var(--glow-gold)/0.2)_0%,hsl(var(--card))_48%,hsl(var(--card))_100%)]",
      orbPrimary: "bg-amber-400/22",
      orbSecondary: "bg-primary/10",
      kicker: "text-amber-300/90",
    };
  }

  if (isAttendance) {
    return {
      container:
        "border-orange-400/30 bg-[radial-gradient(120%_140%_at_100%_0%,rgb(251_146_60/0.28)_0%,hsl(var(--card))_50%,hsl(var(--card))_100%)]",
      orbPrimary: "bg-orange-400/24",
      orbSecondary: "bg-amber-300/14",
      kicker: "text-orange-200/95",
    };
  }

  if (isReports) {
    return {
      container:
        "border-violet-400/25 bg-[radial-gradient(120%_140%_at_100%_0%,rgb(168_85_247/0.24)_0%,hsl(var(--card))_48%,hsl(var(--card))_100%)]",
      orbPrimary: "bg-violet-400/20",
      orbSecondary: "bg-primary/10",
      kicker: "text-violet-300/90",
    };
  }

  if (isSettings) {
    return {
      container:
        "border-slate-300/20 bg-[radial-gradient(120%_140%_at_100%_0%,rgb(148_163_184/0.2)_0%,hsl(var(--card))_48%,hsl(var(--card))_100%)]",
      orbPrimary: "bg-slate-300/18",
      orbSecondary: "bg-primary/8",
      kicker: "text-slate-300/90",
    };
  }

  return {
    container:
      "border-primary/20 bg-[radial-gradient(120%_140%_at_100%_0%,hsl(var(--primary)/0.2)_0%,hsl(var(--card))_46%,hsl(var(--card))_100%)]",
    orbPrimary: "bg-primary/15",
    orbSecondary: "bg-glow-cyan/10",
    kicker: "text-primary/80",
  };
};

const DashboardLayout = ({ children, title, subtitle, hideHero }: DashboardLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { access } = useGymAccess();
  const [notifOpen, setNotifOpen] = useState(false);
  const mobileNavScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const mobileNavDragRef = useRef({ pointerDown: false, startX: 0, startY: 0, moved: false });
  const [canScrollNavForward, setCanScrollNavForward] = useState(false);
  const [mobileNavItemWidth, setMobileNavItemWidth] = useState(72);
  const unreadCount = useUnreadCount();
  const isDemoMode = isDemoGymModeFromLocation(location.pathname, location.search);
  const activeDemoPage = getDemoOwnerPage(location.search);
  // Auto-generate notifications when members data loads
  useAutoGenerateNotifications();

  const initials = (user?.user_metadata?.full_name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    if (isDemoMode) {
      navigate("/");
      return;
    }
    await signOut();
    navigate("/");
  };

  const getNavPath = useCallback(
    (dashboardPath: string) =>
      isDemoMode ? toDemoOwnerPath(dashboardPath) : dashboardPath,
    [isDemoMode],
  );

  const isActivePath = useCallback(
    (dashboardPath: string) =>
      isDemoMode
        ? getOwnerPathFromDemoPage(activeDemoPage) === dashboardPath
        : location.pathname === dashboardPath,
    [activeDemoPage, isDemoMode, location.pathname],
  );

  const activeOwnerPath = isDemoMode
    ? getOwnerPathFromDemoPage(activeDemoPage)
    : location.pathname;
  const isSettingsPage = activeOwnerPath.startsWith("/dashboard/settings");
  const isMembersPage =
    activeOwnerPath.startsWith("/dashboard/members") || title.toLowerCase().includes("member");
  const heroTheme = resolveOwnerHeroTheme(activeOwnerPath, title);
  const heroLabel = title.toUpperCase();
  const heroSubtitle = subtitle || "Track performance, members, and operations in real time.";
  const canManageTrainers = access.features.trainers_manage;
  const canViewReports = access.features.reports_advanced;
  const visibleSidebarItems = sidebarItems.filter((item) => {
    if (item.path === "/dashboard/trainers") return canManageTrainers;
    if (item.path === "/dashboard/reports") return canViewReports;
    return true;
  });
  const visibleMobileNavItems = mobileNavItems.filter((item) => {
    if (item.path === "/dashboard/trainers") return canManageTrainers;
    if (item.path === "/dashboard/reports") return canViewReports;
    return true;
  });

  const updateMobileNavForwardState = useCallback(() => {
    const node = mobileNavScrollRef.current;
    if (!node) return;
    setCanScrollNavForward(node.scrollLeft + node.clientWidth < node.scrollWidth - 6);
  }, []);

  const updateMobileNavItemWidth = useCallback(() => {
    const node = mobileNavScrollRef.current;
    if (!node) return;
    const gapPx = 4;
    const nextWidth = Math.max(62, Math.floor((node.clientWidth - gapPx * 3) / 4));
    setMobileNavItemWidth((prev) => (prev === nextWidth ? prev : nextWidth));
  }, []);

  const scrollMobileNavForward = useCallback(() => {
    const node = mobileNavScrollRef.current;
    if (!node) return;
    const step = mobileNavItemWidth + 4;
    node.scrollBy({ left: step, behavior: "smooth" });
  }, [mobileNavItemWidth]);

  const ensureActiveMobileNavVisible = useCallback((behavior: ScrollBehavior = "auto") => {
    const node = mobileNavScrollRef.current;
    if (!node) return;
    const activeItem = mobileNavItems.find((item) => isActivePath(item.path));
    if (!activeItem) return;

    const activeNode = mobileNavItemRefs.current[activeItem.path];
    if (!activeNode) return;

    const left = activeNode.offsetLeft;
    const right = left + activeNode.offsetWidth;
    const viewportLeft = node.scrollLeft;
    const viewportRight = viewportLeft + node.clientWidth;
    const buffer = 6;

    if (left < viewportLeft + buffer) {
      node.scrollTo({ left: Math.max(0, left - buffer), behavior });
      return;
    }

    if (right > viewportRight - buffer) {
      node.scrollTo({ left: right - node.clientWidth + buffer, behavior });
    }
  }, [isActivePath]);

  const handleMobileNavPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    mobileNavDragRef.current = {
      pointerDown: true,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handleMobileNavPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = mobileNavDragRef.current;
    if (!drag.pointerDown || drag.moved) return;
    const deltaX = Math.abs(event.clientX - drag.startX);
    const deltaY = Math.abs(event.clientY - drag.startY);
    if (deltaX > 8 || deltaY > 8) {
      mobileNavDragRef.current.moved = true;
    }
  };

  const handleMobileNavPointerUp = () => {
    mobileNavDragRef.current.pointerDown = false;
    window.setTimeout(() => {
      mobileNavDragRef.current.moved = false;
    }, 0);
  };

  const handleMobileNavLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    if (!mobileNavDragRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      ensureActiveMobileNavVisible("auto");
      updateMobileNavForwardState();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname, ensureActiveMobileNavVisible, updateMobileNavForwardState]);

  useEffect(() => {
    const node = mobileNavScrollRef.current;
    if (!node) return;

    const savedScrollLeft = Number(window.sessionStorage.getItem(MOBILE_NAV_SCROLL_KEY));
    if (Number.isFinite(savedScrollLeft) && savedScrollLeft > 0) {
      node.scrollLeft = savedScrollLeft;
    }

    const onScroll = () => {
      updateMobileNavForwardState();
      window.sessionStorage.setItem(MOBILE_NAV_SCROLL_KEY, String(node.scrollLeft));
    };
    const onResize = () => {
      updateMobileNavItemWidth();
      updateMobileNavForwardState();
      ensureActiveMobileNavVisible("auto");
    };

    node.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    updateMobileNavItemWidth();
    updateMobileNavForwardState();
    ensureActiveMobileNavVisible("auto");

    return () => {
      node.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [ensureActiveMobileNavVisible, updateMobileNavForwardState, updateMobileNavItemWidth]);

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-4 fixed inset-y-0 left-0 z-30">
        <Link to={getNavPath("/dashboard")} className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">
            Fit<span className="text-gradient">Core</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {visibleSidebarItems.map((item) => {
            const isActive = isActivePath(item.path);
            return (
              <Link
                key={item.path}
                to={getNavPath(item.path)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className="w-5 h-5 relative z-10" />
                <span className="relative z-10">{item.label}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto relative z-10 text-primary/50" />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-3 space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
            <LogOut className="w-5 h-5" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 overflow-x-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 overflow-x-hidden">
          <div className="flex items-center justify-between h-14 lg:h-16">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-base font-bold">
                Fit<span className="text-gradient">Core</span>
              </span>
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setNotifOpen(true)}
                className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors"
                aria-label="Open notifications"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(getNavPath("/dashboard/settings"))}
                aria-label="Open profile settings"
                title="Profile settings"
                className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                {initials}
              </button>

              {isSettingsPage && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  aria-label="Log out"
                  title="Log out"
                  className="lg:hidden h-8 px-3 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Log out
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 pb-28 lg:pb-8 overflow-x-hidden">
          {!hideHero && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative mb-5 lg:mb-6 overflow-hidden rounded-[26px] border p-4 sm:p-5 lg:p-6 shadow-luxury ${heroTheme.container}`}
            >
              <div className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl ${heroTheme.orbPrimary}`} />
              <div className={`pointer-events-none absolute -left-12 -bottom-20 h-48 w-48 rounded-full blur-3xl ${heroTheme.orbSecondary}`} />
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.6)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.45)_1px,transparent_1px)] bg-[size:26px_26px] opacity-[0.18]" />

              <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] ${heroTheme.kicker}`}>
                    {heroLabel}
                  </p>
                  <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-foreground">
                    {title}
                  </h1>
                  <p className="mt-1.5 text-sm sm:text-base text-muted-foreground">
                    {heroSubtitle}
                  </p>
                </div>

                {isMembersPage && (
                  <Button
                    asChild
                    variant="outline"
                    className="group relative h-9 rounded-xl px-3.5 text-[11px] sm:text-xs font-semibold tracking-wide border-primary/25 bg-card/60 text-foreground shadow-[0_10px_18px_rgba(15,23,42,0.35)] hover:bg-card/80"
                  >
                    <Link to={getNavPath("/dashboard/attendance")} className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                      </span>
                      <span className="flex flex-col leading-tight text-left">
                        <span className="text-[9px] font-semibold text-muted-foreground">Quick Access</span>
                        <span className="text-xs font-bold text-foreground">Attendance</span>
                      </span>
                      <Zap className="h-3.5 w-3.5 text-primary/70 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </motion.section>
          )}

          {children}
        </main>
      </div>

            {/* Mobile bottom nav - scroll instead of More menu */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 pt-1 overflow-x-hidden">
        <div className="bg-card/85 backdrop-blur-2xl border border-border rounded-2xl px-2 py-1.5 shadow-luxury">
          <div className="flex items-center gap-1">
          <div
            ref={mobileNavScrollRef}
            className="flex-1 min-w-0 overflow-x-auto scrollbar-hide"
            onPointerDown={handleMobileNavPointerDown}
            onPointerMove={handleMobileNavPointerMove}
            onPointerUp={handleMobileNavPointerUp}
            onPointerCancel={handleMobileNavPointerUp}
          >
            <div className="flex items-center gap-1 w-max pr-1">
              {visibleMobileNavItems.map((item) => {
                const isActive = isActivePath(item.path);
                return (
                  <Link
                    key={item.path}
                    to={getNavPath(item.path)}
                    ref={(node) => {
                      mobileNavItemRefs.current[item.path] = node;
                    }}
                    onClick={handleMobileNavLinkClick}
                    className="relative flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl shrink-0 transform-gpu transition-transform duration-150 active:scale-[0.98]"
                    style={{ width: `${mobileNavItemWidth}px` }}
                  >
                    <div
                      className={`absolute inset-0 rounded-xl border transition-all duration-200 ease-out ${
                        isActive
                          ? "bg-primary/10 border-primary/25 shadow-[0_0_0_1px_rgba(56,189,248,0.18)_inset]"
                          : "bg-transparent border-transparent"
                      }`}
                    />
                    <item.icon
                      className={`w-5 h-5 relative z-10 transition-all duration-200 ease-out ${
                        isActive ? "text-primary scale-105" : "text-muted-foreground scale-100"
                      }`}
                    />
                    <span
                      className={`text-[9px] font-semibold relative z-10 w-full text-center truncate transition-colors duration-200 ease-out ${
                        isActive ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {item.label}
                    </span>
                    <div
                      className={`absolute -top-0.5 w-1 h-1 rounded-full bg-primary transition-all duration-200 ease-out ${
                        isActive ? "opacity-100 scale-100" : "opacity-0 scale-50"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>
          </div>
            <div className="w-8 shrink-0 flex items-center justify-center">
              <button
                type="button"
                onClick={scrollMobileNavForward}
                disabled={!canScrollNavForward}
                className={`w-7 h-7 rounded-md border flex items-center justify-center shadow-[0_0_14px_rgba(56,189,248,0.22)] transition-colors ${
                  canScrollNavForward
                    ? "border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary"
                    : "border-border/60 bg-muted/30 text-muted-foreground/60"
                }`}
                aria-label="Scroll navigation"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Panel */}
      <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
};

export default DashboardLayout;

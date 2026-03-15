import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, ReactNode, useState, useCallback, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dumbbell, Home, Target, Trophy, Medal, User,
  Bell, LogOut, ChevronRight, X, Trash2, AlertTriangle, CheckCircle2, Info, AlertCircle, ChevronsRight, CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useMemberData } from "@/hooks/useMemberData";
import { useMemberNotifications } from "@/hooks/useMemberNotifications";
import { useMemberDataMigration } from "@/hooks/useMemberDataMigration";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useGymAccess } from "@/hooks/useGymAccess";
import FitnessAiChatBubble from "@/components/member/FitnessAiChatBubble";

const sidebarItems = [
  { icon: Home, label: "Home", path: "/member" },
  { icon: Dumbbell, label: "Workouts", path: "/member/workouts", requiresPremium: true },
  { icon: Target, label: "Progress", path: "/member/progress", requiresPremium: true },
  { icon: Trophy, label: "Achievements", path: "/member/achievements", requiresPremium: true },
  { icon: Medal, label: "Leaderboard", path: "/member/leaderboard", requiresPremium: true },
  { icon: CreditCard, label: "Billing", path: "/member/billing" },
  { icon: User, label: "Profile", path: "/member/profile" },
];

const mobileNavItems = sidebarItems.filter(item => item.path !== "/member/profile");
const MOBILE_MEMBER_NAV_SCROLL_KEY = "fitcore.member_mobile_nav.scroll_left";

const demoMemberPageMap: Record<string, string> = {
  "/member": "home",
  "/member/workouts": "workouts",
  "/member/progress": "progress",
  "/member/achievements": "achievements",
  "/member/leaderboard": "leaderboard",
  "/member/billing": "billing",
  "/member/profile": "profile",
};

const notifTypeStyles = {
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10 border-primary/20" },
  success: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
  urgent: { icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
};

interface MemberLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const MemberLayout = ({ children }: MemberLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { access } = useGymAccess();
  const { initials, profile } = useMemberData();
  useMemberDataMigration();
  const { notifications, markRead, markAllRead } = useMemberNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const mobileNavScrollRef = useRef<HTMLDivElement | null>(null);
  const mobileNavItemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const mobileNavDragRef = useRef({ pointerDown: false, startX: 0, startY: 0, moved: false });
  const [canScrollNavForward, setCanScrollNavForward] = useState(false);
  const [mobileNavItemWidth, setMobileNavItemWidth] = useState(74);
  const isDemoMode = location.pathname === "/demo";
  const activeDemoPage = new URLSearchParams(location.search).get("memberPage") || "home";

  const getNavPath = useCallback((memberPath: string) => {
    if (!isDemoMode) return memberPath;
    const memberPage = demoMemberPageMap[memberPath] || "home";
    return `/demo?mode=member&memberPage=${memberPage}`;
  }, [isDemoMode]);

  const isActivePath = useCallback((memberPath: string) => {
    if (!isDemoMode) return location.pathname === memberPath;
    return activeDemoPage === (demoMemberPageMap[memberPath] || "home");
  }, [activeDemoPage, isDemoMode, location.pathname]);

  const visibleNotifications = notifications.filter((n) => !n.is_read);
  const canUsePremium = access.features.member_app_premium;
  const visibleSidebarItems = sidebarItems.filter((item) => !item.requiresPremium || canUsePremium);
  const visibleMobileNavItems = mobileNavItems.filter((item) => !item.requiresPremium || canUsePremium);

  const removeNotification = useCallback((id: string) => {
    markRead.mutate(id);
  }, [markRead]);

  const handleClearAll = useCallback(() => {
    markAllRead.mutate();
  }, [markAllRead]);

  const handleLogout = async () => {
    if (isDemoMode) {
      navigate("/");
      return;
    }
    await signOut();
    navigate("/");
  };

  const updateMobileNavForwardState = useCallback(() => {
    const node = mobileNavScrollRef.current;
    if (!node) return;
    setCanScrollNavForward(node.scrollLeft + node.clientWidth < node.scrollWidth - 6);
  }, []);

  const updateMobileNavItemWidth = useCallback(() => {
    const node = mobileNavScrollRef.current;
    if (!node) return;
    const gapPx = 4;
    const nextWidth = Math.max(66, Math.floor((node.clientWidth - gapPx * 3) / 4));
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

    const savedScrollLeft = Number(window.sessionStorage.getItem(MOBILE_MEMBER_NAV_SCROLL_KEY));
    if (Number.isFinite(savedScrollLeft) && savedScrollLeft > 0) {
      node.scrollLeft = savedScrollLeft;
    }

    const onScroll = () => {
      updateMobileNavForwardState();
      window.sessionStorage.setItem(MOBILE_MEMBER_NAV_SCROLL_KEY, String(node.scrollLeft));
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
        <Link to="/" className="flex items-center gap-2.5 mb-2 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">
            Fit<span className="text-gradient">Core</span>
          </span>
        </Link>

        <div className="px-2 mb-6">
          <span className="text-[10px] uppercase tracking-[0.15em] text-primary font-bold">Member Portal</span>
        </div>

        <nav className="flex-1 space-y-1">
          {visibleSidebarItems.map((item) => {
            const isActive = isActivePath(item.path);
            return (
              <Link
                key={item.path}
                to={getNavPath(item.path)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="memberSidebarActive"
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
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground text-sm"
          >
            <LogOut className="w-5 h-5" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64 overflow-x-hidden">
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8 overflow-x-hidden">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Dumbbell className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-base font-bold">
                Fit<span className="text-gradient">Core</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotifOpen(true)}
                className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                {visibleNotifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground flex items-center justify-center">
                    {visibleNotifications.length > 9 ? "9+" : visibleNotifications.length}
                  </span>
                )}
              </button>
              <Link to={getNavPath("/member/profile")}>
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                  {initials || "?"}
                </div>
              </Link>
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
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
                        className={`text-[9px] font-semibold relative z-10 w-full text-center whitespace-nowrap transition-colors duration-200 ease-out ${
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

      {/* Notification Sheet */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent side="right" className="w-80 sm:w-96 border-border">
          <SheetHeader>
            <div className="flex items-center justify-between pr-2">
              <SheetTitle className="font-display">Notifications</SheetTitle>
              {visibleNotifications.length > 0 && (
                <Button variant="ghost" size="sm" className="text-xs text-destructive gap-1.5 h-7 mr-6" onClick={handleClearAll}>
                  <Trash2 className="w-3 h-3" /> Clear All
                </Button>
              )}
            </div>
          </SheetHeader>
          <div className="mt-6 space-y-3">
            <AnimatePresence>
              {visibleNotifications.map((n) => {
                const style = notifTypeStyles[n.type];
                const IconComp = style.icon;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    className={`border rounded-xl p-4 relative group ${style.bg}`}
                  >
                    <button
                      onClick={() => removeNotification(n.id)}
                      className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-secondary/50 transition-all"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <div className="flex items-start gap-3 pr-8">
                      <div className={`mt-0.5 ${style.color}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-0.5">{n.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5 font-medium">{n.time}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {visibleNotifications.length === 0 && (
              <div className="text-center py-8">
                <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground/60">No notifications</p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <FitnessAiChatBubble isDemoMode={isDemoMode} />
    </div>
  );
};

export default MemberLayout;

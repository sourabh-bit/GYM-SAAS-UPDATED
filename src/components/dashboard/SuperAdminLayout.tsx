import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Shield, LayoutDashboard, Building2, CreditCard, Layers,
  ToggleRight, Activity, FileText, LogOut, Bell, ChevronRight, Settings
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const sidebarItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: Building2, label: "Gyms", path: "/admin/gyms" },
  { icon: CreditCard, label: "Billing", path: "/admin/billing" },
  { icon: Layers, label: "Plans", path: "/admin/plans" },
  { icon: ToggleRight, label: "Feature Flags", path: "/admin/features" },
  { icon: Activity, label: "System Health", path: "/admin/health" },
  { icon: FileText, label: "Audit Logs", path: "/admin/logs" },
  { icon: Settings, label: "Settings", path: "/admin/settings" },
];

const mobileNavItems = sidebarItems.slice(0, 5);

interface SuperAdminLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const SuperAdminLayout = ({ children, title, subtitle }: SuperAdminLayoutProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-4 fixed inset-y-0 left-0 z-30">
        <Link to="/admin" className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-destructive to-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-lg font-bold">
            Fit<span className="text-gradient">Core</span>
            <span className="text-[10px] ml-1.5 px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-semibold uppercase tracking-wider">Admin</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="adminSidebarActive"
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
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 w-full transition-colors">
            <Bell className="w-5 h-5" />
            Alerts
            <span className="ml-auto w-5 h-5 rounded-full bg-destructive/20 text-destructive text-[10px] font-bold flex items-center justify-center">5</span>
          </button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" /> Log out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <div className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-destructive to-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display text-base font-bold">
                Fit<span className="text-gradient">Core</span>
                <span className="text-[9px] ml-1 px-1 py-0.5 rounded-full bg-destructive/20 text-destructive font-semibold">ADMIN</span>
              </span>
            </div>

            <div className="hidden lg:block">
              <h1 className="font-display text-lg font-bold">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-2">
              <button className="relative p-2 rounded-xl hover:bg-secondary/50 transition-colors">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-destructive to-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                SA
              </div>
            </div>
          </div>

          <div className="lg:hidden pb-3">
            <h1 className="font-display text-xl font-bold">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-2 pt-1">
        <div className="bg-glass-strong border border-glass-bright rounded-2xl px-1 py-1.5 shadow-elevated">
          <div className="flex items-center justify-around">
            {mobileNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors"
                >
                  {isActive && (
                    <motion.div
                      layoutId="adminMobileNavActive"
                      className="absolute inset-0 bg-primary/10 rounded-xl"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-5 h-5 relative z-10 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-[9px] font-semibold relative z-10 ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;

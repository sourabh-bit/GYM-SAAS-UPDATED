import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, X, Check, CheckCheck, AlertTriangle, UserPlus,
  Wallet, Clock, Info, ChevronRight, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  useClearAllNotifications,
  type Notification,
} from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import { getOwnerPathForCurrentMode } from "@/lib/demoMode";

const typeConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  warning: { icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  alert: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
  success: { icon: UserPlus, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  info: { icon: Wallet, color: "text-blue-500", bg: "bg-blue-500/10" },
};

/** Map notification metadata key to dashboard route */
const getNotificationRoute = (
  n: Notification,
  pathname: string,
  search: string,
): string => {
  const key = n.metadata?.key;
  let route = "/dashboard";
  switch (key) {
    case "new_member":
      route = "/dashboard/members";
      break;
    case "expiry_soon":
    case "expired":
      route = "/dashboard/members";
      break;
    case "overdue":
    case "pending_payment":
    case "payment_received":
      route = "/dashboard/subscriptions";
      break;
    case "check_in":
      route = "/dashboard/attendance";
      break;
    default:
      route = "/dashboard";
      break;
  }
  return getOwnerPathForCurrentMode(route, pathname, search);
};

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

const NotificationPanel = ({ open, onClose }: NotificationPanelProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: notifications, isLoading } = useNotifications();
  const unreadCount = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const clearAll = useClearAllNotifications();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const filtered = (notifications || []).filter(
    (n) => filter === "all" || !n.is_read
  );

  const getConfig = (type: string) => typeConfig[type] || typeConfig.info;

  const handleNotificationClick = (n: Notification) => {
    if (!n.is_read) markRead.mutate(n.id);
    const route = getNotificationRoute(n, location.pathname, location.search);
    onClose();
    navigate(route);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed z-50 bg-card border border-border shadow-2xl flex flex-col left-2 right-2 top-16 max-h-[68vh] rounded-2xl sm:left-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:w-full sm:max-w-md sm:rounded-none sm:rounded-l-2xl sm:border-y-0 sm:border-r-0 sm:border-l"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bell className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-display font-bold text-base leading-tight">Notifications</h2>
                    <p className="text-[10px] text-muted-foreground">
                      {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onClose}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-primary h-8 max-w-full"
                    onClick={() => markAllRead.mutate()}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </Button>
                )}
                {(notifications || []).length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs gap-1 text-destructive h-8 max-w-full"
                    onClick={() => clearAll.mutate()}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear all</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 p-3 pb-1">
              {(["all", "unread"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    filter === f
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/50 flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No notifications</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {filter === "unread" ? "All notifications are read" : "You're all caught up!"}
                  </p>
                </div>
              ) : (
                filtered.map((n, i) => {
                  const cfg = getConfig(n.type);
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => handleNotificationClick(n)}
                      className={`relative flex gap-3 p-3 rounded-xl cursor-pointer transition-all group ${
                        n.is_read
                          ? "bg-secondary/20 hover:bg-secondary/40"
                          : "bg-secondary/50 hover:bg-secondary/70 border border-border/50"
                      }`}
                    >
                      {!n.is_read && (
                        <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                      <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${n.is_read ? "text-muted-foreground" : "text-foreground"}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                        <p className="text-[9px] text-muted-foreground/50 mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 self-center flex-shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationPanel;

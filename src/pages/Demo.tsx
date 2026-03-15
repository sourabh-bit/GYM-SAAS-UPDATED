import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import DashboardHome from "./dashboard/DashboardHome";
import MembersPage from "./dashboard/MembersPage";
import TrainersPage from "./dashboard/TrainersPage";
import SubscriptionsPage from "./dashboard/SubscriptionsPage";
import AttendancePage from "./dashboard/AttendancePage";
import ReportsPage from "./dashboard/ReportsPage";
import SettingsPage from "./dashboard/SettingsPage";
import MemberHome from "./member/MemberHome";
import MemberWorkouts from "./member/MemberWorkouts";
import MemberProgress from "./member/MemberProgress";
import MemberAchievements from "./member/MemberAchievements";
import MemberLeaderboard from "./member/MemberLeaderboard";
import MemberProfile from "./member/MemberProfile";
import MemberBilling from "./member/MemberBilling";

const Demo = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const dashboardMode: "gym" | "member" =
    searchParams.get("mode") === "member" ? "member" : "gym";

  const activeOwnerPage = searchParams.get("ownerPage") || "dashboard";
  const activeMemberPage = searchParams.get("memberPage") || "home";

  const setDashboardMode = (mode: "gym" | "member") => {
    if (mode === "gym") {
      setSearchParams({ mode: "gym", ownerPage: activeOwnerPage });
      return;
    }

    setSearchParams({ mode: "member", memberPage: activeMemberPage });
  };

  const renderOwnerContent = () => {
    switch (activeOwnerPage) {
      case "members":
        return <MembersPage />;
      case "trainers":
        return <TrainersPage />;
      case "subscriptions":
        return <SubscriptionsPage />;
      case "attendance":
        return <AttendancePage />;
      case "reports":
        return <ReportsPage />;
      case "settings":
        return <SettingsPage />;
      case "dashboard":
      default:
        return <DashboardHome />;
    }
  };

  const renderMemberContent = () => {
    switch (activeMemberPage) {
      case "workouts":
        return <MemberWorkouts />;
      case "progress":
        return <MemberProgress />;
      case "achievements":
        return <MemberAchievements />;
      case "leaderboard":
        return <MemberLeaderboard />;
      case "billing":
        return <MemberBilling />;
      case "profile":
        return <MemberProfile />;
      case "home":
      default:
        return <MemberHome />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <div className="border-b border-border bg-glass-strong px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 overflow-x-hidden">
        <div className="flex items-center justify-between gap-2 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors min-w-0 shrink"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm hidden sm:inline truncate">Back to FitCore</span>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-muted-foreground truncate hidden min-[380px]:inline">
                Interactive Demo
              </span>
            </div>
          </div>
          <Link to="/signup" className="sm:hidden shrink-0">
            <Button variant="glow" size="sm" className="rounded-lg px-3 h-8 gap-1 text-[11px]">
              Start Trial <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          <div className="bg-secondary/40 border border-border rounded-xl p-1 flex items-center w-full sm:w-auto">
            <button
              onClick={() => setDashboardMode("gym")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex-1 sm:flex-none ${
                dashboardMode === "gym"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="sm:hidden">Gym</span>
              <span className="hidden sm:inline">Gym Dashboard</span>
            </button>
            <button
              onClick={() => setDashboardMode("member")}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors flex-1 sm:flex-none ${
                dashboardMode === "member"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="sm:hidden">Member</span>
              <span className="hidden sm:inline">Member Dashboard</span>
            </button>
          </div>

          <Link to="/signup" className="hidden sm:block">
            <Button variant="glow" size="sm" className="rounded-lg px-5 gap-1.5 text-xs">
              Start Free Trial <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${dashboardMode}-${dashboardMode === "gym" ? activeOwnerPage : activeMemberPage}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="h-full overflow-y-auto overflow-x-hidden"
          >
            {dashboardMode === "gym" ? renderOwnerContent() : renderMemberContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Demo;

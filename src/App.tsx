import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import OwnerProtectedRoute from "@/components/OwnerProtectedRoute";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";

const Index = lazy(() => import("./pages/Index"));
const Demo = lazy(() => import("./pages/Demo"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const MemberSignup = lazy(() => import("./pages/MemberSignup"));
const MemberLogin = lazy(() => import("./pages/MemberLogin"));
const MemberResetPassword = lazy(() => import("./pages/MemberResetPassword"));
const DashboardHome = lazy(() => import("./pages/dashboard/DashboardHome"));
const MembersPage = lazy(() => import("./pages/dashboard/MembersPage"));
const TrainersPage = lazy(() => import("./pages/dashboard/TrainersPage"));
const SubscriptionsPage = lazy(() => import("./pages/dashboard/SubscriptionsPage"));
const AttendancePage = lazy(() => import("./pages/dashboard/AttendancePage"));
const ReportsPage = lazy(() => import("./pages/dashboard/ReportsPage"));
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const MemberHome = lazy(() => import("./pages/member/MemberHome"));
const MemberWorkouts = lazy(() => import("./pages/member/MemberWorkouts"));
const MemberProgress = lazy(() => import("./pages/member/MemberProgress"));
const MemberAchievements = lazy(() => import("./pages/member/MemberAchievements"));
const MemberLeaderboard = lazy(() => import("./pages/member/MemberLeaderboard"));
const MemberBilling = lazy(() => import("./pages/member/MemberBilling"));
const MemberProfile = lazy(() => import("./pages/member/MemberProfile"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const RefundPolicy = lazy(() => import("./pages/RefundPolicy"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminGyms = lazy(() => import("./pages/admin/AdminGyms"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminFeatureFlags = lazy(() => import("./pages/admin/AdminFeatureFlags"));
const AdminHealth = lazy(() => import("./pages/admin/AdminHealth"));
const AdminAuditLogs = lazy(() => import("./pages/admin/AdminAuditLogs"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/demo" element={<Demo />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              {/* Member Auth */}
              <Route path="/member-signup" element={<MemberSignup />} />
              <Route path="/member-login" element={<MemberLogin />} />
              <Route path="/member-reset-password" element={<MemberResetPassword />} />
              {/* Legal */}
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/refund" element={<RefundPolicy />} />
              {/* Gym Owner Dashboard */}
              <Route path="/dashboard" element={<OwnerProtectedRoute><DashboardHome /></OwnerProtectedRoute>} />
              <Route path="/dashboard/members" element={<OwnerProtectedRoute><MembersPage /></OwnerProtectedRoute>} />
              <Route path="/dashboard/trainers" element={<OwnerProtectedRoute><TrainersPage /></OwnerProtectedRoute>} />
              <Route path="/dashboard/subscriptions" element={<OwnerProtectedRoute><SubscriptionsPage /></OwnerProtectedRoute>} />
              <Route path="/dashboard/attendance" element={<OwnerProtectedRoute><AttendancePage /></OwnerProtectedRoute>} />
              <Route path="/dashboard/reports" element={<OwnerProtectedRoute><ReportsPage /></OwnerProtectedRoute>} />
              <Route path="/dashboard/settings" element={<OwnerProtectedRoute><SettingsPage /></OwnerProtectedRoute>} />
              {/* Member Portal */}
              <Route path="/member" element={<ProtectedRoute><MemberHome /></ProtectedRoute>} />
              <Route path="/member/workouts" element={<ProtectedRoute><MemberWorkouts /></ProtectedRoute>} />
              <Route path="/member/progress" element={<ProtectedRoute><MemberProgress /></ProtectedRoute>} />
              <Route path="/member/achievements" element={<ProtectedRoute><MemberAchievements /></ProtectedRoute>} />
              <Route path="/member/leaderboard" element={<ProtectedRoute><MemberLeaderboard /></ProtectedRoute>} />
              <Route path="/member/billing" element={<ProtectedRoute><MemberBilling /></ProtectedRoute>} />
              <Route path="/member/profile" element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />
              {/* Legacy member portal routes */}
              <Route path="/dashboard/member-portal" element={<ProtectedRoute><MemberHome /></ProtectedRoute>} />
              <Route path="/dashboard/member-portal/workouts" element={<ProtectedRoute><MemberWorkouts /></ProtectedRoute>} />
              <Route path="/dashboard/member-portal/progress" element={<ProtectedRoute><MemberProgress /></ProtectedRoute>} />
              <Route path="/dashboard/member-portal/achievements" element={<ProtectedRoute><MemberAchievements /></ProtectedRoute>} />
              <Route path="/dashboard/member-portal/leaderboard" element={<ProtectedRoute><MemberLeaderboard /></ProtectedRoute>} />
              <Route path="/dashboard/member-portal/billing" element={<ProtectedRoute><MemberBilling /></ProtectedRoute>} />
              <Route path="/dashboard/member-portal/profile" element={<ProtectedRoute><MemberProfile /></ProtectedRoute>} />
              {/* Super Admin */}
              <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/gyms" element={<AdminProtectedRoute><AdminGyms /></AdminProtectedRoute>} />
              <Route path="/admin/billing" element={<AdminProtectedRoute><AdminBilling /></AdminProtectedRoute>} />
              <Route path="/admin/plans" element={<AdminProtectedRoute><AdminPlans /></AdminProtectedRoute>} />
              <Route path="/admin/features" element={<AdminProtectedRoute><AdminFeatureFlags /></AdminProtectedRoute>} />
              <Route path="/admin/health" element={<AdminProtectedRoute><AdminHealth /></AdminProtectedRoute>} />
              <Route path="/admin/logs" element={<AdminProtectedRoute><AdminAuditLogs /></AdminProtectedRoute>} />
              <Route path="/admin/settings" element={<AdminProtectedRoute><AdminSettings /></AdminProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;

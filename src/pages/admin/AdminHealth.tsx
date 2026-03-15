import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { Activity, Building2, Users, ClipboardList, AlertTriangle } from "lucide-react";
import { useAdminHealthMetrics } from "@/hooks/useAdminHealth";

const AdminHealth = () => {
  const { data, isLoading } = useAdminHealthMetrics();

  const cards = [
    { label: "Total Gyms", value: data?.totalGyms ?? 0, icon: Building2, color: "text-primary" },
    { label: "Total Members", value: data?.totalMembers ?? 0, icon: Users, color: "text-accent" },
    { label: "Check-ins (24h)", value: data?.checkins24h ?? 0, icon: Activity, color: "text-emerald-400" },
    { label: "Pending Plan Requests", value: data?.pendingPlanRequests ?? 0, icon: ClipboardList, color: "text-amber-400" },
    { label: "High Severity Logs (24h)", value: data?.highSeverityLogs24h ?? 0, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <SuperAdminLayout title="System Health" subtitle="Live platform metrics (last 24 hours)">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className="text-2xl font-display font-bold mt-1">
              {isLoading ? "-" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
        This page shows live counts from your database. For infra telemetry (CPU, latency, uptime), connect your monitoring provider and we can wire it here.
      </div>
    </SuperAdminLayout>
  );
};

export default AdminHealth;

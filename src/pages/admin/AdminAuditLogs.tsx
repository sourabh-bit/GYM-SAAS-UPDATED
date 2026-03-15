import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Download, Shield, UserCog, User, Settings, CreditCard, ToggleRight } from "lucide-react";
import { useState } from "react";
import { useAdminAuditLogs } from "@/hooks/useAdminAuditLogs";
import { format } from "date-fns";

const categoryConfig: Record<string, { icon: typeof Shield; color: string }> = {
  user: { icon: User, color: "bg-primary/10 text-primary" },
  gym: { icon: UserCog, color: "bg-accent/10 text-accent" },
  billing: { icon: CreditCard, color: "bg-emerald-500/10 text-emerald-400" },
  feature: { icon: ToggleRight, color: "bg-amber-500/10 text-amber-400" },
  settings: { icon: Settings, color: "bg-muted text-muted-foreground" },
  system: { icon: Shield, color: "bg-secondary text-muted-foreground" },
};

const severityColors: Record<string, string> = {
  high: "bg-destructive/10 text-destructive",
  medium: "bg-amber-500/10 text-amber-400",
  low: "bg-secondary text-muted-foreground",
};

const AdminAuditLogs = () => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const { data: logs = [], isLoading } = useAdminAuditLogs();

  const filtered = logs.filter((l) => {
    const text = `${l.action} ${l.detail ?? ""} ${l.target_label ?? ""}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchCategory = categoryFilter === "all" || l.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <SuperAdminLayout title="Audit Logs" subtitle="Complete record of all administrative actions">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search logs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/30 border-border" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary/30 border border-border text-sm text-foreground">
          <option value="all">All Categories</option>
          <option value="user">Users</option>
          <option value="gym">Gyms</option>
          <option value="billing">Billing</option>
          <option value="feature">Features</option>
          <option value="settings">Settings</option>
          <option value="system">System</option>
        </select>
        <Button variant="outline" className="gap-2"><Download className="w-4 h-4" /> Export</Button>
      </div>

      {isLoading && (
        <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
          Loading audit logs...
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 text-sm text-muted-foreground">
          No audit logs yet.
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((log) => {
          const cat = categoryConfig[log.category] || categoryConfig.system;
          const CatIcon = cat.icon;
          return (
            <div key={log.id} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
              <div className={`w-9 h-9 rounded-xl ${cat.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <CatIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <code className="text-xs font-semibold text-foreground">{log.action}</code>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${severityColors[log.severity] || "bg-secondary text-muted-foreground"}`}>{log.severity}</span>
                </div>
                <p className="text-xs text-muted-foreground">{log.detail || "-"}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  by <span className="font-semibold text-muted-foreground">{log.actor_name || "System"}</span> - {log.target_label || "-"} - {format(new Date(log.created_at), "dd MMM yyyy, h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </SuperAdminLayout>
  );
};

export default AdminAuditLogs;

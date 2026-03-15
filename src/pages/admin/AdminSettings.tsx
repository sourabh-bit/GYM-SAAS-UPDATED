import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { Shield, Mail, Globe, Database, CreditCard } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const tabs = [
  { id: "platform", label: "Platform", icon: Globe },
  { id: "security", label: "Security", icon: Shield },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "email", label: "Email", icon: Mail },
  { id: "maintenance", label: "Maintenance", icon: Database },
];

const defaultSettings = {
  platform_name: "FitCore",
  support_email: "support@fitcore.com",
  default_currency: "USD",
  default_timezone: "UTC",
  notification_new_gym: true,
  notification_failed_payment: true,
  notification_health_alerts: true,
  notification_weekly_report: false,
  require_email_verification: true,
  enable_two_factor: false,
  allow_google_signin: true,
  force_password_reset_90: false,
  api_rate_limit_per_min: 1000,
  login_attempts_before_lock: 5,
  billing_retry_schedule_days: "2,5,9",
  billing_grace_days: 3,
  smtp_host: "smtp.sendgrid.net",
  smtp_port: 587,
  smtp_from_email: "noreply@fitcore.com",
  smtp_from_name: "FitCore Platform",
  maintenance_mode: false,
  maintenance_message: "We are performing scheduled maintenance. We will be back soon!",
};

type SettingsForm = typeof defaultSettings;

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("platform");
  const [form, setForm] = useState<SettingsForm>(defaultSettings);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: async (): Promise<SettingsForm> => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaultSettings;
      return {
        platform_name: data.platform_name,
        support_email: data.support_email,
        default_currency: data.default_currency,
        default_timezone: data.default_timezone,
        notification_new_gym: data.notification_new_gym,
        notification_failed_payment: data.notification_failed_payment,
        notification_health_alerts: data.notification_health_alerts,
        notification_weekly_report: data.notification_weekly_report,
        require_email_verification: data.require_email_verification,
        enable_two_factor: data.enable_two_factor,
        allow_google_signin: data.allow_google_signin,
        force_password_reset_90: data.force_password_reset_90,
        api_rate_limit_per_min: data.api_rate_limit_per_min,
        login_attempts_before_lock: data.login_attempts_before_lock,
        billing_retry_schedule_days: (data.billing_retry_schedule_days || [2, 5, 9]).join(","),
        billing_grace_days: data.billing_grace_days ?? 3,
        smtp_host: data.smtp_host,
        smtp_port: data.smtp_port,
        smtp_from_email: data.smtp_from_email,
        smtp_from_name: data.smtp_from_name,
        maintenance_mode: data.maintenance_mode,
        maintenance_message: data.maintenance_message,
      };
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (payload: SettingsForm) => {
      const retrySchedule = payload.billing_retry_schedule_days
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((v) => Number.isFinite(v) && v > 0)
        .slice(0, 6);
      const safeRetrySchedule = retrySchedule.length > 0 ? retrySchedule : [2, 5, 9];
      const { error } = await supabase
        .from("platform_settings")
        .upsert({
          id: 1,
          ...payload,
          billing_retry_schedule_days: safeRetrySchedule,
          billing_grace_days: Math.max(0, Number(payload.billing_grace_days) || 0),
          updated_at: new Date().toISOString(),
          updated_by: user?.id ?? null,
        }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      toast.success("Settings saved");
      void supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: "platform_settings.updated",
        category: "platform",
        target_label: "Platform settings",
        detail: "Updated platform settings",
        severity: "low",
      });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save settings"),
  });

  const updateForm = (patch: Partial<SettingsForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const handleSave = () => saveMutation.mutate(form);

  const handleRefreshCache = () => {
    queryClient.invalidateQueries();
    toast.success("Cache refreshed");
  };

  const handleRunMigrations = async () => {
    toast.info("Run migrations from CLI: npx supabase db push");
    void supabase.from("admin_audit_logs").insert({
      actor_user_id: user?.id ?? null,
      actor_name: user?.email ?? "Admin",
      action: "maintenance.migrations_hint",
      category: "maintenance",
      target_label: "Database",
      detail: "Requested migration instructions",
      severity: "low",
    });
  };

  const handlePurgeLogs = async () => {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from("admin_audit_logs").delete().lt("created_at", cutoff);
    if (error) {
      toast.error("Failed to purge logs");
      return;
    }
    toast.success("Old audit logs removed");
    void supabase.from("admin_audit_logs").insert({
      actor_user_id: user?.id ?? null,
      actor_name: user?.email ?? "Admin",
      action: "maintenance.audit_logs_purged",
      category: "maintenance",
      target_label: "Audit logs",
      detail: "Purged audit logs older than 90 days",
      severity: "medium",
    });
  };

  return (
    <SuperAdminLayout title="Platform Settings" subtitle="Configure global platform settings">
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:bg-secondary/50"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "platform" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold">General</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Platform Name</Label>
                <Input value={form.platform_name} onChange={(e) => updateForm({ platform_name: e.target.value })} className="mt-1 bg-secondary/30" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Support Email</Label>
                <Input value={form.support_email} onChange={(e) => updateForm({ support_email: e.target.value })} className="mt-1 bg-secondary/30" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Default Currency</Label>
                <Input value={form.default_currency} onChange={(e) => updateForm({ default_currency: e.target.value })} className="mt-1 bg-secondary/30" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Default Timezone</Label>
                <Input value={form.default_timezone} onChange={(e) => updateForm({ default_timezone: e.target.value })} className="mt-1 bg-secondary/30" />
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold">Notifications</h3>
            {[
              { key: "notification_new_gym", label: "New gym signup alerts" },
              { key: "notification_failed_payment", label: "Failed payment notifications" },
              { key: "notification_health_alerts", label: "System health alerts" },
              { key: "notification_weekly_report", label: "Weekly platform report" },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between py-2">
                <span className="text-sm">{n.label}</span>
                <Switch
                  checked={form[n.key as keyof SettingsForm] as boolean}
                  onCheckedChange={(checked) => updateForm({ [n.key]: checked } as Partial<SettingsForm>)}
                />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {activeTab === "security" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold">Authentication</h3>
            {[
              { key: "require_email_verification", label: "Require email verification" },
              { key: "enable_two_factor", label: "Enable two-factor authentication" },
              { key: "allow_google_signin", label: "Allow social sign-in (Google)" },
              { key: "force_password_reset_90", label: "Force password reset every 90 days" },
            ].map((s) => (
              <div key={s.key} className="flex items-center justify-between py-2">
                <span className="text-sm">{s.label}</span>
                <Switch
                  checked={form[s.key as keyof SettingsForm] as boolean}
                  onCheckedChange={(checked) => updateForm({ [s.key]: checked } as Partial<SettingsForm>)}
                />
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold">Rate Limiting</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">API Rate Limit (req/min)</Label>
                <NumericInput
                  value={form.api_rate_limit_per_min}
                  onChange={(e) => updateForm({ api_rate_limit_per_min: Number(e.target.value || 0) })}
                  className="mt-1 bg-secondary/30"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Login Attempts Before Lock</Label>
                <NumericInput
                  value={form.login_attempts_before_lock}
                  onChange={(e) => updateForm({ login_attempts_before_lock: Number(e.target.value || 0) })}
                  className="mt-1 bg-secondary/30"
                />
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </motion.div>
      )}

      {activeTab === "billing" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold">Retry Policy</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Retry Schedule (days)</Label>
                <Input
                  value={form.billing_retry_schedule_days}
                  onChange={(e) => updateForm({ billing_retry_schedule_days: e.target.value })}
                  className="mt-1 bg-secondary/30"
                  placeholder="2,5,9"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Comma-separated days after failure.</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Grace Days Before Lock</Label>
                <NumericInput
                  value={form.billing_grace_days}
                  onChange={(e) => updateForm({ billing_grace_days: Number(e.target.value || 0) })}
                  className="mt-1 bg-secondary/30"
                />
              </div>
            </div>
            <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </motion.div>
      )}

      {activeTab === "email" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h3 className="font-display font-bold">Email Templates</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">SMTP Host</Label>
              <Input value={form.smtp_host} onChange={(e) => updateForm({ smtp_host: e.target.value })} className="mt-1 bg-secondary/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">SMTP Port</Label>
              <Input value={form.smtp_port} onChange={(e) => updateForm({ smtp_port: Number(e.target.value || 0) })} className="mt-1 bg-secondary/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">From Email</Label>
              <Input value={form.smtp_from_email} onChange={(e) => updateForm({ smtp_from_email: e.target.value })} className="mt-1 bg-secondary/30" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">From Name</Label>
              <Input value={form.smtp_from_name} onChange={(e) => updateForm({ smtp_from_name: e.target.value })} className="mt-1 bg-secondary/30" />
            </div>
          </div>
          <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>
      )}

      {activeTab === "maintenance" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold">Maintenance Mode</h3>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-medium">Enable Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Shows maintenance page to all non-admin users</p>
              </div>
              <Switch
                checked={form.maintenance_mode}
                onCheckedChange={(checked) => updateForm({ maintenance_mode: checked })}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Maintenance Message</Label>
              <Input value={form.maintenance_message} onChange={(e) => updateForm({ maintenance_message: e.target.value })} className="mt-1 bg-secondary/30" />
            </div>
            <Button className="bg-primary text-primary-foreground" onClick={handleSave} disabled={saveMutation.isPending || isLoading}>
              {saveMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-display font-bold">Database</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={handleRunMigrations}>Run Migrations</Button>
              <Button variant="outline" onClick={handleRefreshCache}>Clear Cache</Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10">Purge Logs</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Purge old audit logs?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete audit logs older than 90 days. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurgeLogs}>Purge</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </motion.div>
      )}
    </SuperAdminLayout>
  );
};

export default AdminSettings;

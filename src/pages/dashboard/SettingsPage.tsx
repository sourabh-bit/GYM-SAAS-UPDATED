import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Building2, Bell, Mail, Phone, MapPin, Save, Crown,
  Check, ArrowUpRight, Zap, Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  usePlatformPlans,
  useCurrentGymPlan,
  useGymPlanRequests,
  useSubmitPlanRequest,
  type PlatformPlan,
} from "@/hooks/usePlatformPlans";
import { format } from "date-fns";
import { isDemoGymMode } from "@/lib/demoMode";
import {
  DEMO_GYM_ID,
  getDemoGymProfile,
  updateDemoGymProfile,
} from "@/lib/demoGymData";
import { formatCurrencyINR } from "@/lib/currency";
import { useGymAccess } from "@/hooks/useGymAccess";

type NotificationPreferences = {
  payment_reminders: boolean;
  new_member_alerts: boolean;
  subscription_expiry: boolean;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  payment_reminders: true,
  new_member_alerts: true,
  subscription_expiry: true,
};

const parseNotificationPreferences = (value: unknown): NotificationPreferences => {
  if (!value || typeof value !== "object") return DEFAULT_NOTIFICATION_PREFERENCES;

  const root = value as Record<string, unknown>;
  const notifications = root.notifications;
  if (!notifications || typeof notifications !== "object") return DEFAULT_NOTIFICATION_PREFERENCES;

  const source = notifications as Record<string, unknown>;
  return {
    payment_reminders:
      typeof source.payment_reminders === "boolean"
        ? source.payment_reminders
        : DEFAULT_NOTIFICATION_PREFERENCES.payment_reminders,
    new_member_alerts:
      typeof source.new_member_alerts === "boolean"
        ? source.new_member_alerts
        : DEFAULT_NOTIFICATION_PREFERENCES.new_member_alerts,
    subscription_expiry:
      typeof source.subscription_expiry === "boolean"
        ? source.subscription_expiry
        : DEFAULT_NOTIFICATION_PREFERENCES.subscription_expiry,
  };
};

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState("general");
  const { user, gymId } = useAuth();
  const isDemoMode = isDemoGymMode();
  const effectiveGymId = gymId || (isDemoMode ? DEMO_GYM_ID : null);
  const [gymName, setGymName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );

  const { data: platformPlans = [] } = usePlatformPlans();
  const { data: gymPlanData } = useCurrentGymPlan();
  const { data: planRequests = [] } = useGymPlanRequests();
  const submitRequest = useSubmitPlanRequest();
  const { access } = useGymAccess();

  const currentPlan = platformPlans.find(p => p.id === gymPlanData?.current_plan_id);
  const planExpiry = gymPlanData?.plan_expires_at;

  useEffect(() => {
    if (user) {
      setOwnerName(user.user_metadata?.full_name || "");
      setEmail(user.email || "");
    } else if (isDemoMode) {
      setOwnerName("Demo Owner");
      setEmail("owner@fitcore.demo");
    }
    if (isDemoMode) {
      const demoGym = getDemoGymProfile();
      setGymName(demoGym.name || "");
      setPhone(demoGym.phone || "");
      setAddress(demoGym.address || "");
      setNotificationPrefs(parseNotificationPreferences(demoGym.owner_preferences));
      return;
    }
    if (gymId) {
      supabase.from("gyms").select("*").eq("id", gymId).single().then(({ data }) => {
        if (data) {
          setGymName(data.name || "");
          setPhone(data.phone || "");
          setAddress(data.address || "");
          setNotificationPrefs(parseNotificationPreferences(data.owner_preferences));
        }
      });
    }
  }, [gymId, isDemoMode, user]);

  const persistNotificationPreferences = async (
    nextPreferences: NotificationPreferences,
    showSuccess = false,
  ) => {
    if (!effectiveGymId) return;
    setSavingNotifications(true);

    if (isDemoMode) {
      updateDemoGymProfile({
        owner_preferences: {
          notifications: nextPreferences,
        },
      });
      if (showSuccess) toast.success("Notification preferences saved");
      setSavingNotifications(false);
      return;
    }

    const { error } = await supabase
      .from("gyms")
      .update({
        owner_preferences: {
          notifications: nextPreferences,
        },
      })
      .eq("id", effectiveGymId);

    if (error) {
      toast.error("Failed to save notification preferences");
    } else if (showSuccess) {
      toast.success("Notification preferences saved");
    }

    setSavingNotifications(false);
  };

  const handleSave = async () => {
    if (!effectiveGymId || saving) return;
    setSaving(true);

    if (isDemoMode) {
      updateDemoGymProfile({
        name: gymName,
        phone,
        address,
        owner_preferences: {
          notifications: notificationPrefs,
        },
      });
      toast.success("Settings saved!");
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("gyms")
      .update({
        name: gymName,
        phone,
        address,
        owner_preferences: {
          notifications: notificationPrefs,
        },
      })
      .eq("id", effectiveGymId);

    if (error) toast.error("Failed to save changes");
    else toast.success("Settings saved!");
    setSaving(false);
  };

  const handleNotificationToggle = async (
    key: keyof NotificationPreferences,
    checked: boolean,
  ) => {
    const nextPreferences: NotificationPreferences = {
      ...notificationPrefs,
      [key]: checked,
    };
    setNotificationPrefs(nextPreferences);
    await persistNotificationPreferences(nextPreferences);
  };

  const handlePlanRequest = async (plan: PlatformPlan, type: "upgrade" | "renew") => {
    if (!effectiveGymId) return;
    const hasPending = planRequests.some(r => r.status === "pending");
    if (hasPending) {
      toast.error("You already have a pending request");
      return;
    }
    try {
      await submitRequest.mutateAsync({
        gym_id: effectiveGymId,
        requested_plan_id: plan.id,
        request_type: type,
        gym_name: gymName,
        owner_name: ownerName,
        message: type === "renew"
          ? `Renewal request for ${plan.name} plan`
          : `Upgrade request to ${plan.name} plan`,
      });
      toast.success(`${type === "renew" ? "Renewal" : "Upgrade"} request sent to admin!`);
    } catch {
      toast.error("Failed to send request");
    }
  };

  const tabs = [
    { id: "general", label: "General", icon: Building2 },
    { id: "plan", label: "My Plan", icon: Crown },
    { id: "notifications", label: "Alerts", icon: Bell },
  ];

  const planTierColors: Record<string, { border: string; glow: string; badge: string; icon: string }> = {
    Basic: { border: "border-muted-foreground/30", glow: "bg-muted-foreground/5", badge: "bg-muted-foreground/10 text-muted-foreground", icon: "text-muted-foreground" },
    Growth: { border: "border-primary/30", glow: "bg-primary/5", badge: "bg-primary/10 text-primary", icon: "text-primary" },
    Pro: { border: "border-glow-gold/30", glow: "bg-glow-gold/5", badge: "bg-glow-gold/10 text-glow-gold", icon: "text-glow-gold" },
    Starter: { border: "border-muted-foreground/30", glow: "bg-muted-foreground/5", badge: "bg-muted-foreground/10 text-muted-foreground", icon: "text-muted-foreground" },
    Professional: { border: "border-primary/30", glow: "bg-primary/5", badge: "bg-primary/10 text-primary", icon: "text-primary" },
    Enterprise: { border: "border-glow-gold/30", glow: "bg-glow-gold/5", badge: "bg-glow-gold/10 text-glow-gold", icon: "text-glow-gold" },
  };

  const tierLabelMap: Record<string, string> = {
    trial: "Trial",
    basic: "Basic",
    growth: "Growth",
    pro: "Pro",
    locked: "Locked",
    unknown: "Unknown",
  };

  const tierBadgeStyles: Record<string, string> = {
    trial: "border-glow-cyan/30 bg-glow-cyan/10 text-glow-cyan",
    basic: "border-muted-foreground/40 bg-muted-foreground/15 text-muted-foreground",
    growth: "border-primary/30 bg-primary/10 text-primary",
    pro: "border-glow-gold/30 bg-glow-gold/10 text-glow-gold",
    locked: "border-destructive/30 bg-destructive/10 text-destructive",
    unknown: "border-border bg-secondary/40 text-muted-foreground",
  };

  const formatMemberLimit = (plan: PlatformPlan) => {
    if (!plan?.max_members) return "--";
    if (plan.max_members >= 5000) return "Unlimited";
    if (plan.max_members === 50) return "50+";
    return String(plan.max_members);
  };

  return (
    <DashboardLayout title="Settings" subtitle="Manage your gym preferences">
      <div className="flex gap-1.5 mb-5 overflow-x-auto scrollbar-hide pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-primary/10 text-primary border border-primary/20"
                : "text-muted-foreground hover:bg-secondary/50 border border-transparent"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 lg:p-6">
            <h3 className="font-display font-bold text-sm sm:text-base mb-4">Gym Information</h3>
            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Gym Name</Label>
                <Input value={gymName} onChange={(e) => setGymName(e.target.value)} className="h-10 bg-secondary/50 border-border rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm">Owner Name</Label>
                <Input value={ownerName} disabled className="h-10 bg-secondary/50 border-border rounded-xl text-sm opacity-60" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</Label>
                <Input value={email} disabled className="h-10 bg-secondary/50 border-border rounded-xl text-sm opacity-60" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="h-10 bg-secondary/50 border-border rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs sm:text-sm flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Address</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Your gym address" className="h-10 bg-secondary/50 border-border rounded-xl text-sm" />
              </div>
            </div>
            <Button variant="glow" className="mt-5 rounded-xl gap-2 text-sm h-10" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </motion.div>
      )}

      {activeTab === "plan" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Current Plan Card */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-sm sm:text-base">Current Plan</h3>
                  <p className="text-[10px] text-muted-foreground">Your active subscription</p>
                </div>
              </div>
              <span
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide ${tierBadgeStyles[access.tier] || tierBadgeStyles.unknown}`}
              >
                Tier: {tierLabelMap[access.tier] || "Unknown"}
              </span>
            </div>

            {currentPlan ? (
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-display text-lg font-bold">{currentPlan.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {formatCurrencyINR(currentPlan.price)}/{currentPlan.billing_cycle}
                    </span>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-primary/10 text-primary uppercase">Active</span>
                </div>
                {planExpiry && (
                  <p className="text-[11px] text-muted-foreground mb-3">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Expires: {format(new Date(planExpiry), "dd MMM yyyy")}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {(currentPlan.features as string[]).map((f, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Check className="w-3 h-3 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-secondary/30 rounded-xl p-6 text-center border border-border/50">
                <Crown className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No plan assigned yet</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">Choose a plan below to get started</p>
              </div>
            )}
          </div>

          {/* Available Plans */}
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 lg:p-6">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <h3 className="font-display font-bold text-sm sm:text-base">Plan Packages</h3>
                <p className="text-[10px] text-muted-foreground">Compare tiers and the features you unlock.</p>
              </div>
              <span className="text-[9px] text-muted-foreground">{platformPlans.length} options</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3 lg:gap-5">
              {platformPlans.map((plan, idx) => {
                const isCurrentPlan = plan.id === currentPlan?.id;
                const colors = planTierColors[plan.name] || planTierColors.Starter;
                const isHighlight = plan.name.toLowerCase().includes("growth") || plan.name.toLowerCase().includes("professional");
                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`relative rounded-2xl border p-5 sm:p-4 lg:p-5 flex flex-col transition-all ${
                      isCurrentPlan
                        ? `${colors.border} ${colors.glow} ring-1 ring-primary/10`
                        : "border-border hover:border-primary/20 hover:bg-secondary/20"
                    }`}
                  >
                    {isCurrentPlan && (
                      <span className={`absolute -top-2.5 right-3 text-[9px] font-bold px-2.5 py-0.5 rounded-full ${colors.badge} uppercase tracking-wider`}>
                        Current
                      </span>
                    )}
                    {!isCurrentPlan && isHighlight && (
                      <span className="absolute -top-2.5 left-3 text-[9px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary uppercase tracking-wider">
                        Most Popular
                      </span>
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-display font-bold text-base sm:text-sm lg:text-base">{plan.name}</h4>
                        <p className="text-[10px] text-muted-foreground mt-1">Best for {plan.max_members <= 150 ? "startups" : plan.max_members <= 800 ? "growing gyms" : "multi‑location"}</p>
                      </div>
                      <span className={`text-[9px] font-semibold px-2 py-1 rounded-full border ${colors.badge}`}>
                        {plan.billing_cycle === "year" ? "Yearly" : "Monthly"}
                      </span>
                    </div>

                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="font-display text-3xl sm:text-2xl lg:text-3xl font-black text-primary">
                        {formatCurrencyINR(plan.price)}
                      </span>
                      <span className="text-xs sm:text-[10px] lg:text-xs text-muted-foreground font-normal">/{plan.billing_cycle}</span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground border border-border/60 rounded-xl px-3 py-2 bg-secondary/20">
                      <span>Member Limit</span>
                      <span className="font-semibold text-foreground">
                        {formatMemberLimit(plan)}
                      </span>
                    </div>

                    <div className="mt-4 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Included</p>
                      <div className="space-y-2.5 sm:space-y-2">
                        {(plan.features as string[]).map((f, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs sm:text-[10px] lg:text-xs text-muted-foreground">
                            <Check className="w-3.5 h-3.5 sm:w-3 sm:h-3 text-primary flex-shrink-0" />
                            <span>{f}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 sm:mt-4">
                      {!isCurrentPlan ? (
                        <Button
                          variant="glow"
                          className="w-full rounded-xl text-xs gap-2 h-10 sm:h-9"
                          onClick={() => handlePlanRequest(plan, "upgrade")}
                          disabled={submitRequest.isPending}
                        >
                          <ArrowUpRight className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Request Upgrade
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full rounded-xl text-xs gap-2 h-10 sm:h-9 border-primary/20"
                          onClick={() => handlePlanRequest(plan, "renew")}
                          disabled={submitRequest.isPending}
                        >
                          <Zap className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> Request Renewal
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Request History */}
          {planRequests.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-4 sm:p-5">
              <h3 className="font-display font-bold text-sm mb-3">Request History</h3>
              <div className="space-y-2">
                {planRequests.map((req) => {
                  const plan = platformPlans.find(p => p.id === req.requested_plan_id);
                  return (
                    <div key={req.id} className="flex items-center justify-between p-2.5 rounded-xl border border-border/30 bg-secondary/20">
                      <div>
                        <p className="text-[11px] font-medium capitalize">
                          {req.request_type} {"->"} {plan?.name || "Unknown"}
                        </p>
                        <p className="text-[9px] text-muted-foreground">{format(new Date(req.created_at), "dd MMM yyyy, h:mm a")}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        req.status === "approved" ? "bg-primary/10 text-primary" :
                        req.status === "rejected" ? "bg-destructive/10 text-destructive" :
                        "bg-glow-gold/10 text-glow-gold"
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {activeTab === "notifications" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 sm:space-y-6">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 lg:p-6">
            <h3 className="font-display font-bold text-sm sm:text-base mb-4">Notification Preferences</h3>
            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  key: "payment_reminders" as const,
                  label: "Payment Reminders",
                  desc: "Auto-send reminders for due payments",
                },
                {
                  key: "new_member_alerts" as const,
                  label: "New Member Alerts",
                  desc: "Get notified when a new member joins",
                },
                {
                  key: "subscription_expiry" as const,
                  label: "Subscription Expiry",
                  desc: "Alert before subscriptions expire",
                },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="mr-3">
                    <p className="text-xs sm:text-sm font-medium">{n.label}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch
                    checked={notificationPrefs[n.key]}
                    onCheckedChange={(checked) => {
                      void handleNotificationToggle(n.key, checked);
                    }}
                    disabled={savingNotifications}
                  />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              className="mt-4 rounded-xl text-sm h-10"
              onClick={() => void persistNotificationPreferences(notificationPrefs, true)}
              disabled={savingNotifications}
            >
              {savingNotifications ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </motion.div>
      )}
    </DashboardLayout>
  );
};

export default SettingsPage;

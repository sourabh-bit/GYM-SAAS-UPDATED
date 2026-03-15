import MemberLayout from "@/components/dashboard/MemberLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User, Mail, Phone, Calendar, CreditCard, MapPin,
  Save, Shield, Dumbbell, Flame, Zap, LogOut, Trophy
} from "lucide-react";
import { useMemberData } from "@/hooks/useMemberData";
import { useMemberXP, getXPProgress } from "@/hooks/useChallenges";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import MemberHeroCard from "@/components/member/MemberHeroCard";
import { openRazorpayCheckout } from "@/lib/razorpay";

const MemberProfile = () => {
  const { member, profile, gym, trainer, attendance, isLoading, refetchProfile } = useMemberData();
  const { signOut, user } = useAuth();
  const { xp, level, tier } = useMemberXP();
  const xpProgress = getXPProgress(xp);
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [enablingAutopay, setEnablingAutopay] = useState(false);

  const startEdit = () => {
    setFullName(profile?.full_name || "");
    setPhone(profile?.phone || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() })
      .eq("id", user.id);

    if (error) {
      toast.error("Failed to save profile");
    } else {
      toast.success("Profile updated!");
      setEditing(false);
      refetchProfile();
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handlePayNow = async () => {
    if (!member?.id || paying) return;
    setPaying(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
        body: { member_id: member.id },
      });
      if (error) throw error;
      if (!data?.order_id || !data?.key_id) throw new Error("Unable to start payment");

      const response = await openRazorpayCheckout({
        key: data.key_id,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency || "INR",
        name: gym?.name || "FitCore",
        description: member.plan_name ? `${member.plan_name} membership` : "Membership payment",
        prefill: {
          name: profile?.full_name || member.name,
          email: profile?.email || member.email || "",
          contact: profile?.phone || member.phone || "",
        },
        theme: { color: "#16a34a" },
      });

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
        body: { ...response, intent_id: data.intent_id },
      });
      if (verifyError) throw verifyError;
      toast.success(verifyData?.pending_confirmation
        ? "Payment submitted. Confirmation pending."
        : "Payment successful");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed";
      toast.error(message);
    } finally {
      setPaying(false);
    }
  };

  const handleEnableAutopay = async () => {
    if (!member?.id || enablingAutopay) return;
    setEnablingAutopay(true);
    try {
      const { data, error } = await supabase.functions.invoke("razorpay-create-subscription", {
        body: { member_id: member.id },
      });
      if (error) throw error;
      if (!data?.subscription_id || !data?.key_id) throw new Error("Unable to start autopay setup");

      const response = await openRazorpayCheckout({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: gym?.name || "FitCore",
        description: "Enable autopay for your membership",
        prefill: {
          name: profile?.full_name || member.name,
          email: profile?.email || member.email || "",
          contact: profile?.phone || member.phone || "",
        },
        theme: { color: "#16a34a" },
      });

      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
        body: { ...response, context: "subscription" },
      });
      if (verifyError) throw verifyError;
      toast.success(verifyData?.pending_confirmation
        ? "Autopay setup submitted. Confirmation pending."
        : "Autopay enabled");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Autopay setup failed";
      toast.error(message);
    } finally {
      setEnablingAutopay(false);
    }
  };

  if (isLoading) {
    return (
      <MemberLayout title="Profile" subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MemberLayout>
    );
  }

  const displayName = profile?.full_name || member?.name || "Member";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const joinDate = member?.joined_at ? format(new Date(member.joined_at), "MMM yyyy") : "—";
  const totalCheckins = attendance.length;

  return (
    <MemberLayout title="Profile" subtitle="Your account and membership">
      <MemberHeroCard
        eyebrow="Member Profile"
        title={displayName}
        subtitle="Manage your account details, plan status, and gym identity."
        gymName={gym?.name}
        chips={[
          { label: member?.plan_name || "No active plan", icon: <Shield className="w-3.5 h-3.5" />, tone: "primary" },
          { label: member?.status === "active" ? "Active Member" : member?.status || "Status unavailable", tone: member?.status === "active" ? "success" : "warning" },
          { label: `Joined ${joinDate}`, icon: <Calendar className="w-3.5 h-3.5" />, tone: "muted" },
        ]}
        className="mb-6"
      />

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center text-2xl font-bold text-primary-foreground mx-auto mb-4">
            {initials}
          </div>
          <h3 className="font-display text-xl font-bold mb-1 capitalize">{displayName}</h3>
          <p className="text-sm text-muted-foreground mb-4">Member since {joinDate}</p>

          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full mb-3">
            <Shield className="w-3.5 h-3.5" /> {member?.plan_name || "No Plan"}
          </div>

          {/* Rank Badge */}
          <div className={`${tier.bg} border ${tier.border} rounded-2xl p-4 mb-5`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${tier.bg} border ${tier.border} flex items-center justify-center`}>
                <span className="text-xl">{tier.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-display text-base font-bold ${tier.color}`}>{tier.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}>Lv. {level}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-background/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${xpProgress.progress}%` }}
                      transition={{ delay: 0.3, duration: 0.8 }}
                      className={`h-full rounded-full bg-gradient-to-r ${tier.gradient}`}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{xp} XP</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-secondary/30 rounded-xl p-3">
              <Dumbbell className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-display text-lg font-bold">{totalCheckins}</p>
              <p className="text-[10px] text-muted-foreground">Check-ins</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3">
              <Flame className="w-4 h-4 text-glow-gold mx-auto mb-1" />
              <p className="font-display text-lg font-bold">{member?.status === "active" ? "Active" : member?.status || "—"}</p>
              <p className="text-[10px] text-muted-foreground">Status</p>
            </div>
            <div className="bg-secondary/30 rounded-xl p-3">
              <Zap className="w-4 h-4 text-glow-cyan mx-auto mb-1" />
              <p className="font-display text-lg font-bold">{member?.due_amount ? `₹${member.due_amount}` : "₹0"}</p>
              <p className="text-[10px] text-muted-foreground">Due</p>
            </div>
          </div>
        </motion.div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-4"
        >
          {/* Personal Info */}
          <div className="bg-card border border-border rounded-2xl p-5 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-base">Personal Information</h3>
              {!editing && (
                <Button variant="ghost" size="sm" className="text-xs text-primary gap-1" onClick={startEdit}>
                  Edit
                </Button>
              )}
            </div>
            {editing ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3" /> Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} className="h-10 bg-secondary/50 border-border rounded-xl capitalize" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</Label>
                    <Input value={profile?.email || ""} disabled className="h-10 bg-secondary/50 border-border rounded-xl opacity-60" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 bg-secondary/50 border-border rounded-xl" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => setEditing(false)}>Cancel</Button>
                  <Button variant="glow" className="rounded-xl gap-2" onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><User className="w-3 h-3" /> Full Name</p>
                  <p className="text-sm font-medium capitalize">{displayName}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Mail className="w-3 h-3" /> Email</p>
                  <p className="text-sm font-medium">{profile?.email || member?.email || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="w-3 h-3" /> Phone</p>
                  <p className="text-sm font-medium">{profile?.phone || member?.phone || "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Joined</p>
                  <p className="text-sm font-medium">{joinDate}</p>
                </div>
              </div>
            )}
          </div>

          {/* Membership Details */}
          <div className="bg-card border border-border rounded-2xl p-5 lg:p-6">
            <h3 className="font-display font-bold text-base mb-4">Membership Details</h3>
            <div className="space-y-3">
              {[
                { label: "Plan", value: member?.plan_name || "No Plan", icon: CreditCard },
                { label: "Gym", value: gym ? `${gym.name}${gym.address ? `, ${gym.address}` : ""}` : "—", icon: MapPin },
                { label: "Valid Until", value: member?.expiry_at ? format(new Date(member.expiry_at), "MMMM d, yyyy") : "—", icon: Calendar },
                { label: "Payment Status", value: (member?.payment_status || "—").charAt(0).toUpperCase() + (member?.payment_status || "").slice(1), icon: Shield },
                { label: "Trainer", value: trainer?.name || "Not assigned", icon: Dumbbell },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                  </div>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>

            {(member?.plan_name && member.plan_name !== "No Plan") && (
              <div className="mt-5 flex flex-wrap gap-2">
                {(member?.due_amount || 0) > 0 && (
                  <Button
                    variant="glow"
                    className="rounded-xl"
                    onClick={handlePayNow}
                    disabled={paying}
                  >
                    {paying ? "Starting..." : "Pay Now"}
                  </Button>
                )}
                {!member?.autopay_enabled && (
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    onClick={handleEnableAutopay}
                    disabled={enablingAutopay}
                  >
                    {enablingAutopay ? "Setting up..." : "Enable Autopay"}
                  </Button>
                )}
                {member?.autopay_enabled && (
                  <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                    Autopay enabled
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Log out */}
          <Button
            variant="outline"
            className="w-full rounded-xl gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" /> Log Out
          </Button>
        </motion.div>
      </div>
    </MemberLayout>
  );
};

export default MemberProfile;

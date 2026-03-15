import MemberLayout from "@/components/dashboard/MemberLayout";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useMemberData } from "@/hooks/useMemberData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { openRazorpayCheckout } from "@/lib/razorpay";
import { toast } from "sonner";
import { format } from "date-fns";
import { CreditCard, Calendar, Shield, Clock } from "lucide-react";
import { formatCurrencyINR } from "@/lib/currency";

const isDemoMemberMode = () =>
  typeof window !== "undefined" &&
  window.location.pathname === "/demo" &&
  new URLSearchParams(window.location.search).get("mode") === "member";

const MemberBilling = () => {
  const { member, profile, gym, isLoading } = useMemberData();
  const isDemoMode = isDemoMemberMode();
  const [paying, setPaying] = useState(false);
  const [enablingAutopay, setEnablingAutopay] = useState(false);

  const { data: autopay, isLoading: autopayLoading } = useQuery({
    queryKey: ["member-autopay", member?.id],
    queryFn: async () => {
      if (!member?.id) return null;
      const { data, error } = await supabase
        .from("payment_subscriptions")
        .select("*")
        .eq("member_id", member.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!member?.id && !isDemoMode,
    staleTime: 2 * 60 * 1000,
  });

  const autopayEnabled = member?.autopay_enabled || autopay?.autopay_enabled;
  const nextChargeAt = autopay?.next_charge_at ? format(new Date(autopay.next_charge_at), "MMM d, yyyy") : "—";
  const statusLabel = autopay?.status ? autopay.status.charAt(0).toUpperCase() + autopay.status.slice(1) : "—";

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

      const { error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
        body: { ...response, intent_id: data.intent_id },
      });
      if (verifyError) throw verifyError;
      toast.success("Payment successful");
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

      const { error: verifyError } = await supabase.functions.invoke("razorpay-verify-payment", {
        body: { ...response, context: "subscription" },
      });
      if (verifyError) throw verifyError;
      toast.success("Autopay enabled");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Autopay setup failed";
      toast.error(message);
    } finally {
      setEnablingAutopay(false);
    }
  };

  if (isLoading || autopayLoading) {
    return (
      <MemberLayout title="Billing" subtitle="">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MemberLayout>
    );
  }

  if (!member) {
    return (
      <MemberLayout title="Billing" subtitle="">
        <div className="text-center text-sm text-muted-foreground py-12">Member profile unavailable.</div>
      </MemberLayout>
    );
  }

  const dueAmount = member.due_amount || 0;
  const planName = member.plan_name || "No Plan";

  return (
    <MemberLayout title="Billing" subtitle="Autopay status and upcoming charges">
      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="font-display font-bold text-base mb-4">Membership Plan</h3>
          <div className="space-y-3">
            {[
              { label: "Plan", value: planName, icon: CreditCard },
              { label: "Next Charge", value: nextChargeAt, icon: Calendar },
              { label: "Autopay Status", value: autopayEnabled ? "Enabled" : "Disabled", icon: Shield },
              { label: "Gateway Status", value: statusLabel, icon: Clock },
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
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 bg-card border border-border rounded-2xl p-6"
        >
          <h3 className="font-display font-bold text-base mb-4">Payment Actions</h3>
          <div className="bg-secondary/30 rounded-xl p-4 mb-4">
            <p className="text-[11px] text-muted-foreground">Amount Due</p>
            <p className="font-display text-2xl font-bold text-destructive">{formatCurrencyINR(dueAmount)}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {dueAmount > 0 && (
              <Button variant="glow" className="rounded-xl" onClick={handlePayNow} disabled={paying}>
                {paying ? "Starting..." : "Pay Now"}
              </Button>
            )}
            {!autopayEnabled && (
              <Button variant="outline" className="rounded-xl" onClick={handleEnableAutopay} disabled={enablingAutopay}>
                {enablingAutopay ? "Setting up..." : "Enable Autopay"}
              </Button>
            )}
            {autopayEnabled && (
              <span className="text-xs font-semibold px-3 py-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                Autopay is active
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </MemberLayout>
  );
};

export default MemberBilling;

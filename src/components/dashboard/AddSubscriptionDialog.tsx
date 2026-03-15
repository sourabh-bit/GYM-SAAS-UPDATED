import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { usePlans } from "@/hooks/usePlans";
import { useUpdateMember, type Member } from "@/hooks/useMembers";
import { createNotificationIfMissing } from "@/hooks/notification-utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { addDays, format } from "date-fns";
import { isDemoGymMode } from "@/lib/demoMode";
import { DEMO_GYM_ID, addDemoSubscription } from "@/lib/demoGymData";
import { formatCurrencyINR } from "@/lib/currency";

interface Props {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SubscriptionForm = ({ member, onClose }: { member: Member; onClose: () => void }) => {
  const { data: plans = [] } = usePlans();
  const activePlans = plans.filter((p) => p.is_active);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(false);
  const updateMember = useUpdateMember();
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();
  const effectiveGymId = gymId || (isDemoMode ? DEMO_GYM_ID : null);
  const queryClient = useQueryClient();

  const selectedPlan = activePlans.find((p) => p.id === selectedPlanId);

  const handleSubmit = async () => {
    if (!selectedPlan || !effectiveGymId || loading) return;

    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = addDays(startDate, selectedPlan.duration_days);

      if (isDemoMode) {
        addDemoSubscription({
          gym_id: effectiveGymId,
          member_id: member.id,
          member_name: member.name,
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          amount: selectedPlan.price,
          amount_paid: 0,
          payment_status: "pending" as const,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        });

        await updateMember.mutateAsync({
          id: member.id,
          plan_id: selectedPlan.id,
          plan_name: selectedPlan.name,
          due_amount: selectedPlan.price,
          payment_status: "pending" as const,
          expiry_at: endDate.toISOString(),
        });
      } else {
        const { error: assignError } = await supabase.rpc("owner_assign_plan", {
          p_member_id: member.id,
          p_plan_id: selectedPlan.id,
          p_start_at: startDate.toISOString(),
        });
        if (assignError) throw assignError;
      }

      if (!isDemoMode) {
        await createNotificationIfMissing({
          gym_id: effectiveGymId,
          title: "Payment Pending",
          message: `${member.name} has ${formatCurrencyINR(selectedPlan.price)} pending payment.`,
          type: "info",
          metadata: {
            key: "pending_payment",
            member_id: member.id,
            date: format(startDate, "yyyy-MM-dd"),
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      toast.success("Subscription added successfully");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add subscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-1">
      <div>
        <Label className="text-xs text-muted-foreground mb-2 block">Select Plan</Label>
        {activePlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active plans. Create a plan in the Subscriptions page first.</p>
        ) : (
          <div className="space-y-2">
            {activePlans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`w-full text-left p-3 rounded-xl border transition-colors ${
                  selectedPlanId === plan.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-secondary/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">{plan.duration_days} days</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatCurrencyINR(plan.price)}</p>
                </div>
                {plan.description && (
                  <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedPlan && (
        <div className="bg-secondary/30 rounded-xl p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Start</span>
            <span>{format(new Date(), "MMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Expires</span>
            <span>{format(addDays(new Date(), selectedPlan.duration_days), "MMM d, yyyy")}</span>
          </div>
          <div className="flex justify-between text-xs font-medium pt-1 border-t border-border">
            <span>Amount Due</span>
            <span className="text-primary">{formatCurrencyINR(selectedPlan.price)}</span>
          </div>
        </div>
      )}

      <Button
        className="w-full rounded-xl"
        disabled={!selectedPlanId || loading}
        onClick={handleSubmit}
      >
        {loading ? "Adding..." : "Add Subscription"}
      </Button>
    </div>
  );
};

const AddSubscriptionDialog = ({ member, open, onOpenChange }: Props) => {
  const isMobile = useIsMobile();
  if (!member) return null;

  const handleClose = () => onOpenChange(false);

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl border-border">
          <SheetHeader>
            <SheetTitle>Add Subscription</SheetTitle>
            <SheetDescription>Assign a plan to {member.name}</SheetDescription>
          </SheetHeader>
          <SubscriptionForm member={member} onClose={handleClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Add Subscription</DialogTitle>
          <DialogDescription>Assign a plan to {member.name}</DialogDescription>
        </DialogHeader>
        <SubscriptionForm member={member} onClose={handleClose} />
      </DialogContent>
    </Dialog>
  );
};

export default AddSubscriptionDialog;

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { format, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Users, TrendingUp, CreditCard, Edit2, Sparkles, Trash2 } from "lucide-react";
import { usePlans, useAddPlan, useDeletePlan, useUpdatePlan, type Plan } from "@/hooks/usePlans";
import { useMembers } from "@/hooks/useMembers";
import { useSubscriptions } from "@/hooks/useSubscriptions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrencyINR } from "@/lib/currency";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";

const DURATION_PRESETS = [
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Half Yearly", days: 180 },
  { label: "Yearly", days: 365 },
  { label: "Custom", days: 0 },
];

type PlanFormMode = "create" | "edit";

interface PlanFormProps {
  mode: PlanFormMode;
  initialPlan?: Plan | null;
  onClose: () => void;
}

const getDurationLabel = (days: number) => {
  if (days === 365) return "year";
  if (days === 180) return "6 months";
  if (days === 90) return "quarter";
  if (days === 30) return "month";
  return `${days} days`;
};

const getDurationPresetLabel = (days: number) => {
  if (days === 365) return "Yearly";
  if (days === 180) return "Half Yearly";
  if (days === 90) return "Quarterly";
  if (days === 30) return "Monthly";
  return `${days} Days`;
};

const PlanForm = ({ mode, initialPlan = null, onClose }: PlanFormProps) => {
  const matchedPreset = initialPlan
    ? DURATION_PRESETS.find((preset) => preset.days > 0 && preset.days === initialPlan.duration_days)
    : DURATION_PRESETS[0];

  const [name, setName] = useState(initialPlan?.name ?? "");
  const [price, setPrice] = useState(initialPlan ? String(initialPlan.price) : "");
  const [durationPreset, setDurationPreset] = useState<string>(matchedPreset?.label ?? (initialPlan ? "Custom" : "Monthly"));
  const [customDays, setCustomDays] = useState(initialPlan && !matchedPreset ? String(initialPlan.duration_days) : "");
  const [startDate, setStartDate] = useState<Date>(new Date());

  const addPlan = useAddPlan();
  const updatePlan = useUpdatePlan();

  const selectedPreset = DURATION_PRESETS.find((preset) => preset.label === durationPreset);
  const durationDays = durationPreset === "Custom" ? Number(customDays) || 0 : selectedPreset?.days || 30;
  const endDate = durationDays > 0 ? addDays(startDate, durationDays) : null;
  const isPending = addPlan.isPending || updatePlan.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || durationDays <= 0) return;

    if (mode === "edit" && initialPlan) {
      await updatePlan.mutateAsync({
        id: initialPlan.id,
        name: name.trim(),
        price: Number(price) || 0,
        duration_days: durationDays,
        description: initialPlan.description ?? "",
        is_active: initialPlan.is_active,
      });
      onClose();
      return;
    }

    await addPlan.mutateAsync({
      name: name.trim(),
      price: Number(price) || 0,
      duration_days: durationDays,
      description: "",
      is_active: true,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Plan Name *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pro Monthly"
          className="h-10 rounded-xl bg-secondary/50 border-border capitalize"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Duration *</Label>
        <Select value={durationPreset} onValueChange={setDurationPreset}>
          <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border">
            {DURATION_PRESETS.map((preset) => (
              <SelectItem key={preset.label} value={preset.label}>
                {preset.label}
                {preset.days > 0 ? ` (${preset.days} days)` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {durationPreset === "Custom" && (
          <NumericInput
            value={customDays}
            onChange={(e) => setCustomDays(e.target.value)}
            placeholder="0"
            className="h-10 rounded-xl bg-secondary/50 border-border"
            min={1}
            required
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full h-10 rounded-xl bg-secondary/50 border-border justify-start text-left font-normal",
                  !startDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                {format(startDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={(date) => date && setStartDate(date)}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>End Date</Label>
          <div className="h-10 rounded-xl bg-secondary/30 border border-border flex items-center px-3">
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm">{endDate ? format(endDate, "MMM d, yyyy") : "Not set"}</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Price</Label>
        <NumericInput
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="0"
          className="h-10 rounded-xl bg-secondary/50 border-border"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
          Cancel
        </Button>
        <Button type="submit" variant="glow" className="flex-1 rounded-xl" disabled={isPending || durationDays <= 0}>
          {isPending ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Plan"}
        </Button>
      </div>
    </form>
  );
};

const SubscriptionsPage = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const { data: plans = [], isLoading } = usePlans();
  const { data: members = [] } = useMembers();
  const { data: subscriptions = [] } = useSubscriptions();
  const deletePlan = useDeletePlan();
  const [addOpen, setAddOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (accessLoading) {
    return (
      <DashboardLayout title="Subscriptions" subtitle="Manage gym membership plans">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (access.isLocked) {
    return (
      <DashboardLayout title="Subscriptions" subtitle="Manage gym membership plans">
        <FeatureLock
          title="Plan Required"
          description="Your trial has ended. Choose a plan to unlock subscriptions and continue using the platform."
        />
      </DashboardLayout>
    );
  }

  const totalSubscribers = members.filter((member) => member.plan_id).length;
  const activeSubs = members.filter((member) => member.plan_id && member.status === "active").length;
  const activePlans = plans.filter((plan) => plan.is_active).length;

  const metrics = [
    { label: "Total Plans", value: String(plans.length), icon: TrendingUp, glow: "bg-primary/30" },
    { label: "Active Plans", value: String(activePlans), icon: Sparkles, glow: "bg-emerald-500/30" },
    { label: "Total Members", value: String(totalSubscribers), icon: Users, glow: "bg-glow-cyan/30" },
    { label: "Active Members", value: String(activeSubs), icon: CreditCard, glow: "bg-glow-gold/30" },
  ];

  const getSubscriberCount = (plan: Plan) =>
    members.filter((member) => member.plan_id === plan.id && member.status === "active").length;
  const getPlanRevenue = (plan: Plan) =>
    subscriptions
      .filter((sub) => sub.plan_id === plan.id)
      .reduce((sum, sub) => sum + (sub.amount_paid || 0), 0);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    try {
      await deletePlan.mutateAsync(deleteId);
      setDeleteId(null);
    } catch {
      // Toast is handled in mutation hook.
    }
  };

  return (
    <DashboardLayout title="Subscriptions" subtitle="Manage gym membership plans">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 lg:gap-4 mb-5">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileTap={{ scale: 0.97 }}
            className="relative bg-card border border-border rounded-2xl p-3.5 sm:p-4 lg:p-5 group overflow-hidden"
          >
            <div className={`absolute -top-6 -right-6 w-16 h-16 rounded-full blur-2xl opacity-0 group-hover:opacity-40 transition-opacity ${metric.glow}`} />
            <div className="relative z-10">
              <metric.icon className="w-4 h-4 text-primary mb-2" />
              <p className="font-display text-xl sm:text-2xl font-bold">{metric.value}</p>
              <p className="text-[10px] text-muted-foreground">{metric.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-sm sm:text-base">Membership Plans</h3>
        <Button
          variant="glow"
          size="sm"
          className="h-8 sm:h-9 gap-1.5 rounded-xl text-[11px]"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" /> New Plan
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-card/40">
          <p className="text-sm text-muted-foreground mb-3">No plans yet. Create your first membership plan.</p>
          <Button variant="outline" className="rounded-xl" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Create Plan
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {plans.map((plan, index) => {
            const subscribers = getSubscriberCount(plan);
            const revenue = getPlanRevenue(plan);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.06 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-primary/5 p-4 sm:p-5 shadow-lg shadow-primary/5"
              >
                <div className="absolute -top-10 -right-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                <div className="relative z-10">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center rounded-full border border-border/70 bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
                      {getDurationPresetLabel(plan.duration_days)}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold border",
                        plan.is_active
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-muted bg-muted/30 text-muted-foreground",
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", plan.is_active ? "bg-emerald-400" : "bg-muted-foreground")} />
                      {plan.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-base capitalize">{plan.name}</h4>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-display text-3xl font-bold">{formatCurrencyINR(Number(plan.price))}</span>
                    <span className="text-xs text-muted-foreground">/{getDurationLabel(plan.duration_days)}</span>
                  </div>

                  <div className="mt-4 border-t border-border/60 pt-3 space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Members</span>
                      <span className="font-semibold">{subscribers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Revenue</span>
                      <span className="font-semibold text-emerald-400">{formatCurrencyINR(revenue)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 rounded-xl border-border/70 bg-background/60 hover:bg-secondary/70"
                      onClick={() => setEditPlan(plan)}
                    >
                      <Edit2 className="w-4 h-4 mr-1.5" /> Edit
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-xl border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                      onClick={() => setDeleteId(plan.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {isMobile ? (
        <>
          <Sheet open={addOpen} onOpenChange={setAddOpen}>
            <SheetContent side="bottom" className="rounded-t-3xl p-5 pt-3 border-border">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <SheetHeader className="pb-4 text-left">
                <SheetTitle>New Membership Plan</SheetTitle>
                <SheetDescription>Create a plan for your gym</SheetDescription>
              </SheetHeader>
              <PlanForm mode="create" onClose={() => setAddOpen(false)} />
            </SheetContent>
          </Sheet>

          <Sheet open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)}>
            <SheetContent side="bottom" className="rounded-t-3xl p-5 pt-3 border-border">
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-border" />
              </div>
              <SheetHeader className="pb-4 text-left">
                <SheetTitle>Edit Membership Plan</SheetTitle>
                <SheetDescription>Update plan details</SheetDescription>
              </SheetHeader>
              {editPlan && <PlanForm mode="edit" initialPlan={editPlan} onClose={() => setEditPlan(null)} />}
            </SheetContent>
          </Sheet>
        </>
      ) : (
        <>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent className="sm:max-w-md rounded-2xl border-border">
              <DialogHeader>
                <DialogTitle>New Membership Plan</DialogTitle>
                <DialogDescription>Create a plan for your gym</DialogDescription>
              </DialogHeader>
              <PlanForm mode="create" onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>

          <Dialog open={!!editPlan} onOpenChange={(open) => !open && setEditPlan(null)}>
            <DialogContent className="sm:max-w-md rounded-2xl border-border">
              <DialogHeader>
                <DialogTitle>Edit Membership Plan</DialogTitle>
                <DialogDescription>Update plan details</DialogDescription>
              </DialogHeader>
              {editPlan && <PlanForm mode="edit" initialPlan={editPlan} onClose={() => setEditPlan(null)} />}
            </DialogContent>
          </Dialog>
        </>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Plan</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected membership plan will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={deletePlan.isPending}
            >
              {deletePlan.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default SubscriptionsPage;

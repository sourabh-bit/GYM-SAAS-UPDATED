import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { type Member, useUpdateMember } from "@/hooks/useMembers";
import { createNotificationIfMissing } from "@/hooks/notification-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { addDemoSubscription } from "@/lib/demoGymData";
import { isDemoGymMode } from "@/lib/demoMode";
import { formatCurrencyINR } from "@/lib/currency";

const statusColors: Record<string, string> = {
  active: "text-primary",
  expired: "text-destructive",
  frozen: "text-glow-gold",
  trial: "text-glow-cyan",
};

const paymentStatusColors: Record<string, string> = {
  paid: "text-primary",
  pending: "text-glow-gold",
  overdue: "text-destructive",
  partial: "text-glow-cyan",
};

interface MemberDetailSheetProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const InfoCell = ({ label, value, className = "" }: { label: string; value: string; className?: string }) => (
  <div className={className}>
    <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
    <p className="text-sm font-semibold">{value || "—"}</p>
  </div>
);

const formatDate = (d: string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "—");

const MemberContent = ({ member, onClose }: { member: Member; onClose: () => void }) => {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const hasPlan = !!member.plan_name?.trim();

  const paymentStatusText = !hasPlan
    ? "No plan assigned"
    : member.payment_status === "paid"
      ? `Paid (${formatCurrencyINR(member.due_amount)} due)`
      : `${member.payment_status.charAt(0).toUpperCase() + member.payment_status.slice(1)} (${formatCurrencyINR(member.due_amount)} due)`;

  const paymentStatusClass = !hasPlan
    ? "text-muted-foreground"
    : paymentStatusColors[member.payment_status];

  const paymentMethodDisplay = member.payment_method?.startsWith("upi:")
    ? `UPI (Ref: ${member.payment_method.replace("upi:", "")})`
    : member.payment_method
      ? member.payment_method.charAt(0).toUpperCase() + member.payment_method.slice(1)
      : "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-base font-bold text-primary">
          {initials}
        </div>
        <div>
          <p className="text-base font-semibold capitalize">{member.name}</p>
          <p className="text-xs text-muted-foreground">{member.email || "No email"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        <InfoCell label="Phone" value={member.phone || "—"} />
        <InfoCell label="Plan" value={member.plan_name || "No plan"} />
        <InfoCell
          label="Status"
          value={member.status.charAt(0).toUpperCase() + member.status.slice(1)}
          className={statusColors[member.status]}
        />
        <InfoCell label="Joined" value={formatDate(member.joined_at)} />
        <InfoCell label="Expiry" value={formatDate(member.expiry_at)} />
        <InfoCell
          label="Last Payment"
          value={member.last_payment ? formatCurrencyINR(member.last_payment) : "—"}
        />
        <InfoCell label="Payment Status" value={paymentStatusText} className={paymentStatusClass} />
        <InfoCell label="Payment Method" value={paymentMethodDisplay} />
        <InfoCell label="Payment Date" value={formatDate(member.payment_date)} />
        <InfoCell label="Due Amount" value={formatCurrencyINR(member.due_amount)} />
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" className="rounded-xl border-border px-6" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

const MemberDetailSheet = ({ member, open, onOpenChange }: MemberDetailSheetProps) => {
  const isMobile = useIsMobile();
  if (!member) return null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85dvh] overflow-y-auto p-5 pt-3 border-border pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <SheetHeader className="pb-4 text-left">
            <SheetTitle className="text-lg font-bold">Member Details</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">Full profile information</SheetDescription>
          </SheetHeader>
          <MemberContent member={member} onClose={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border p-6">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-bold">Member Details</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">Full profile information</DialogDescription>
        </DialogHeader>
        <MemberContent member={member} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

interface EditMemberDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditMemberDialog = ({ member, open, onOpenChange }: EditMemberDialogProps) => {
  const isMobile = useIsMobile();
  if (!member) return null;

  const content = <EditMemberForm member={member} onClose={() => onOpenChange(false)} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85dvh] overflow-y-auto p-5 pt-3 border-border pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <SheetHeader className="pb-4 text-left">
            <SheetTitle>Edit Member</SheetTitle>
            <SheetDescription>Update member details</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription>Update member details</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

const EditMemberForm = ({ member, onClose }: { member: Member; onClose: () => void }) => {
  const [name, setName] = useState(member.name);
  const [email, setEmail] = useState(member.email || "");
  const [phone, setPhone] = useState(member.phone || "");
  const [status, setStatus] = useState(member.status);
  const updateMember = useUpdateMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMember.isPending) return;
    await updateMember.mutateAsync({ id: member.id, name, email, phone, status });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-10 rounded-xl bg-secondary/50 border-border capitalize"
          style={{ textTransform: "capitalize" }}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as Member["status"])}
          className="w-full h-10 px-3 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="frozen">Frozen</option>
          <option value="trial">Trial</option>
        </select>
      </div>
      <div className="mt-2 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-luxury backdrop-blur">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button type="submit" variant="glow" className="flex-1 rounded-xl" disabled={updateMember.isPending}>
            {updateMember.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  );
};

interface CollectPaymentDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CollectPaymentDialog = ({ member, open, onOpenChange }: CollectPaymentDialogProps) => {
  const isMobile = useIsMobile();
  if (!member) return null;

  const content = <CollectPaymentForm member={member} onClose={() => onOpenChange(false)} />;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl max-h-[85dvh] overflow-y-auto p-5 pt-3 border-border pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-border" />
          </div>
          <SheetHeader className="pb-4 text-left">
            <SheetTitle>Collect Payment</SheetTitle>
            <SheetDescription>Record a payment from {member.name}</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border">
        <DialogHeader>
          <DialogTitle>Collect Payment</DialogTitle>
          <DialogDescription>Record a payment from {member.name}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

const upiProofSchema = z
  .string()
  .trim()
  .min(8, "Enter a valid UPI reference ID")
  .max(40, "UPI reference is too long")
  .regex(/^[A-Za-z0-9_-]+$/, "UPI proof must contain only letters, numbers, _ or -");

const CollectPaymentForm = ({ member, onClose }: { member: Member; onClose: () => void }) => {
  const [amount, setAmount] = useState(member.due_amount > 0 ? member.due_amount.toString() : "");
  const [method, setMethod] = useState("cash");
  const [upiProof, setUpiProof] = useState("");
  const updateMember = useUpdateMember();
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateMember.isPending) return;

    if (!member.plan_name?.trim()) {
      toast.error("Assign a plan before collecting payment");
      return;
    }

    const paidAmount = Number(amount);
    if (!paidAmount || paidAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (member.due_amount > 0 && paidAmount > member.due_amount) {
      toast.error("Amount cannot exceed due amount");
      return;
    }

    let methodToSave = method;
    let upiRef = "";
    if (method === "upi") {
      const upiCheck = upiProofSchema.safeParse(upiProof);
      if (!upiCheck.success) {
        toast.error(upiCheck.error.issues[0]?.message || "Invalid UPI proof");
        return;
      }
      upiRef = upiCheck.data;
      methodToSave = `upi:${upiCheck.data}`;
    }

    const newDue = Math.max(0, member.due_amount - paidAmount);
    const paymentTimestamp = new Date().toISOString();
    let paymentHistoryId: string | null = null;

    if (isDemoMode) {
      addDemoSubscription({
        gym_id: member.gym_id,
        member_id: member.id,
        plan_id: member.plan_id,
        plan_name: member.plan_name || "No Plan",
        member_name: member.name,
        amount: member.due_amount > 0 ? member.due_amount : paidAmount,
        amount_paid: paidAmount,
        payment_method: methodToSave,
        payment_status: newDue === 0 ? "paid" : "partial",
        start_date: paymentTimestamp,
        end_date: member.expiry_at,
        created_at: paymentTimestamp,
      });

      await updateMember.mutateAsync({
        id: member.id,
        last_payment: paidAmount,
        due_amount: newDue,
        payment_status: newDue === 0 ? "paid" : "partial",
        payment_method: methodToSave,
        payment_date: paymentTimestamp,
      });
    } else {
      const { data: paymentResult, error: paymentError } = await supabase.rpc("owner_record_payment", {
        p_member_id: member.id,
        p_amount: paidAmount,
        p_payment_method: method,
        p_upi_ref: upiRef || null,
      });

      if (paymentError) {
        toast.error(paymentError.message);
        return;
      }

      const payload = (paymentResult || {}) as { payment_id?: string };
      paymentHistoryId = payload.payment_id || null;
      const applyPaymentUpdate = (m: Member) => ({
        ...m,
        last_payment: paidAmount,
        due_amount: newDue,
        payment_status: newDue === 0 ? "paid" : "partial",
        payment_method: methodToSave,
        payment_date: paymentTimestamp,
      });

      queryClient.setQueriesData({ queryKey: ["members"] }, (old: Member[] | undefined) => {
        if (!old) return old;
        return old.map((m) => (m.id === member.id ? applyPaymentUpdate(m) : m));
      });

      queryClient.setQueriesData({ queryKey: ["members-page"] }, (old: any) => {
        if (!old || !Array.isArray(old.rows)) return old;
        return { ...old, rows: old.rows.map((m: Member) => (m.id === member.id ? applyPaymentUpdate(m) : m)) };
      });

      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    }

    if (!isDemoMode) {
      const methodLabel = methodToSave.startsWith("upi:") ? "UPI" : "Cash";
      await createNotificationIfMissing({
        gym_id: member.gym_id,
        title: "Payment Received",
        message: `${formatCurrencyINR(paidAmount)} received from ${member.name} via ${methodLabel}.`,
        type: "success",
        metadata: {
          key: "payment_received",
          event_id: paymentHistoryId || `${member.id}-${paymentTimestamp}`,
          member_id: member.id,
          date: paymentTimestamp.slice(0, 10),
        },
      });
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-secondary/30 rounded-xl p-3 text-center">
        <p className="text-[10px] text-muted-foreground">Current Due</p>
        <p className="font-display text-2xl font-bold text-destructive">{formatCurrencyINR(member.due_amount)}</p>
      </div>

      <div className="space-y-2">
        <Label>Amount Received *</Label>
        <NumericInput
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="h-10 rounded-xl bg-secondary/50 border-border"
          required
          min={1}
        />
      </div>

      <div className="space-y-2">
        <Label>Payment Method</Label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="w-full h-10 px-3 rounded-xl bg-secondary/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
        </select>
      </div>

      {method === "upi" && (
        <div className="space-y-2">
          <Label>UPI Proof (Reference ID) *</Label>
          <Input
            value={upiProof}
            onChange={(e) => setUpiProof(e.target.value)}
            placeholder="e.g. 240861936512"
            className="h-10 rounded-xl bg-secondary/50 border-border"
            required
          />
          <p className="text-[11px] text-muted-foreground">Enter UPI transaction reference so the app can verify proof.</p>
        </div>
      )}

      <div className="mt-2 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-luxury backdrop-blur">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">
            Cancel
          </Button>
          <Button type="submit" variant="glow" className="flex-1 rounded-xl" disabled={updateMember.isPending}>
            {updateMember.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default MemberDetailSheet;

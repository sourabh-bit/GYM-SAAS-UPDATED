import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAddMember } from "@/hooks/useMembers";

interface AddMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddMemberForm = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  
  const addMember = useAddMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addMember.isPending) return;
    if (!name.trim()) return;
    await addMember.mutateAsync({
      name,
      email,
      phone,
      plan_id: null,
      plan_name: null,
      trainer_id: null,
      status: "active",
      joined_at: new Date().toISOString(),
      expiry_at: null,
      due_amount: 0,
      last_payment: 0,
      payment_status: "pending",
      payment_method: null,
      payment_date: null,
      last_checkin: null,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Aarav Singh" className="h-10 rounded-xl bg-secondary/50 border-border capitalize" style={{ textTransform: 'capitalize' }} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
      </div>
      <div className="mt-2 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-luxury backdrop-blur">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button type="submit" variant="glow" className="flex-1 rounded-xl" disabled={addMember.isPending}>
            {addMember.isPending ? "Adding..." : "Add Member"}
          </Button>
        </div>
      </div>
    </form>
  );
};

const AddMemberDialog = ({ open, onOpenChange }: AddMemberDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl p-5 pt-3 border-border max-h-[85dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-border" /></div>
          <SheetHeader className="pb-4 text-left">
            <SheetTitle>Add New Member</SheetTitle>
            <SheetDescription>Enter member details below</SheetDescription>
          </SheetHeader>
          <AddMemberForm onClose={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border">
        <DialogHeader>
          <DialogTitle>Add New Member</DialogTitle>
          <DialogDescription>Enter member details below</DialogDescription>
        </DialogHeader>
        <AddMemberForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default AddMemberDialog;

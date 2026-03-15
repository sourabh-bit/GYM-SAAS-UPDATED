import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAddTrainer } from "@/hooks/useTrainers";

interface AddTrainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddTrainerForm = ({ onClose }: { onClose: () => void }) => {
  const [name, setName] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [schedule, setSchedule] = useState("");
  const addTrainer = useAddTrainer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addTrainer.isPending) return;
    if (!name.trim()) return;
    await addTrainer.mutateAsync({
      name, specialty, phone, email, schedule,
      members_count: 0, rating: 0, status: "active",
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Full Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Arjun Kapoor" className="h-10 rounded-xl bg-secondary/50 border-border capitalize" required />
      </div>
      <div className="space-y-2">
        <Label>Specialty</Label>
        <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Strength & Conditioning" className="h-10 rounded-xl bg-secondary/50 border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Schedule</Label>
        <Input value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="e.g. Mon-Sat, 6AM-12PM" className="h-10 rounded-xl bg-secondary/50 border-border" />
      </div>
      <div className="mt-2 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-luxury backdrop-blur">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button type="submit" variant="glow" className="flex-1 rounded-xl" disabled={addTrainer.isPending}>
            {addTrainer.isPending ? "Adding..." : "Add Trainer"}
          </Button>
        </div>
      </div>
    </form>
  );
};

const AddTrainerDialog = ({ open, onOpenChange }: AddTrainerDialogProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-3xl p-5 pt-3 border-border">
          <div className="flex justify-center mb-3"><div className="w-10 h-1 rounded-full bg-border" /></div>
          <SheetHeader className="pb-4 text-left">
            <SheetTitle>Add New Trainer</SheetTitle>
            <SheetDescription>Enter trainer details below</SheetDescription>
          </SheetHeader>
          <AddTrainerForm onClose={() => onOpenChange(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border">
        <DialogHeader>
          <DialogTitle>Add New Trainer</DialogTitle>
          <DialogDescription>Enter trainer details below</DialogDescription>
        </DialogHeader>
        <AddTrainerForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

export default AddTrainerDialog;

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUpdateTrainer, type Trainer } from "@/hooks/useTrainers";
import { useMembers, useUpdateMember, type Member } from "@/hooks/useMembers";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { isDemoGymMode } from "@/lib/demoMode";
import { toast } from "sonner";
import { Users, X, UserPlus, Phone, Mail, Clock, Star } from "lucide-react";

// View trainer
const TrainerViewContent = ({ trainer, onClose }: { trainer: Trainer; onClose: () => void }) => {
  const { data: members = [] } = useMembers();
  const assigned = members.filter(m => m.trainer_id === trainer.id);

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center text-lg font-bold text-primary">
          {trainer.name.split(" ").map(n => n[0]).join("")}
        </div>
        <div>
          <h3 className="font-display font-bold text-base">{trainer.name}</h3>
          <p className="text-xs text-primary">{trainer.specialty || "General"}</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {trainer.phone && (
          <div className="flex items-center gap-2 text-sm"><Phone className="w-3.5 h-3.5 text-muted-foreground" /> {trainer.phone}</div>
        )}
        {trainer.email && (
          <div className="flex items-center gap-2 text-sm"><Mail className="w-3.5 h-3.5 text-muted-foreground" /> {trainer.email}</div>
        )}
        <div className="flex items-center gap-2 text-sm"><Clock className="w-3.5 h-3.5 text-muted-foreground" /> {trainer.schedule || "No schedule"}</div>
        <div className="flex items-center gap-2 text-sm"><Star className="w-3.5 h-3.5 text-glow-gold" /> {Number(trainer.rating).toFixed(1)} rating</div>
        <div className="flex items-center gap-2 text-sm"><Users className="w-3.5 h-3.5 text-muted-foreground" /> {assigned.length} members assigned</div>
      </div>
      {assigned.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned Members</p>
          <div className="space-y-1">
            {assigned.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-secondary/30 rounded-lg px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {m.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </div>
                <span className="text-xs font-medium capitalize">{m.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Button variant="outline" onClick={onClose} className="w-full rounded-xl">Close</Button>
    </div>
  );
};

export const ViewTrainerDialog = ({ trainer, open, onOpenChange }: { trainer: Trainer | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const isMobile = useIsMobile();
  if (!trainer) return null;
  const close = () => onOpenChange(false);

  if (isMobile) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-border">
        <SheetHeader><SheetTitle>Trainer Details</SheetTitle><SheetDescription>{trainer.name}</SheetDescription></SheetHeader>
        <TrainerViewContent trainer={trainer} onClose={close} />
      </SheetContent>
    </Sheet>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border max-w-md">
        <DialogHeader><DialogTitle>Trainer Details</DialogTitle><DialogDescription>{trainer.name}</DialogDescription></DialogHeader>
        <TrainerViewContent trainer={trainer} onClose={close} />
      </DialogContent>
    </Dialog>
  );
};

// Edit trainer
const EditTrainerForm = ({ trainer, onClose }: { trainer: Trainer; onClose: () => void }) => {
  const [name, setName] = useState(trainer.name);
  const [specialty, setSpecialty] = useState(trainer.specialty || "");
  const [phone, setPhone] = useState(trainer.phone || "");
  const [email, setEmail] = useState(trainer.email || "");
  const [schedule, setSchedule] = useState(trainer.schedule || "");
  const [status, setStatus] = useState(trainer.status);
  const updateTrainer = useUpdateTrainer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (updateTrainer.isPending) return;
    await updateTrainer.mutateAsync({ id: trainer.id, name, specialty, phone, email, schedule, status });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-1">
      <div className="space-y-2">
        <Label>Name</Label>
        <Input value={name} onChange={e => setName(e.target.value)} className="h-10 rounded-xl bg-secondary/50 border-border capitalize" required />
      </div>
      <div className="space-y-2">
        <Label>Specialty</Label>
        <Input value={specialty} onChange={e => setSpecialty(e.target.value)} className="h-10 rounded-xl bg-secondary/50 border-border" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={email} onChange={e => setEmail(e.target.value)} className="h-10 rounded-xl bg-secondary/50 border-border" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Schedule</Label>
        <Input value={schedule} onChange={e => setSchedule(e.target.value)} className="h-10 rounded-xl bg-secondary/50 border-border" />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <select value={status} onChange={e => setStatus(e.target.value as Trainer["status"])}
          className="w-full h-10 px-3 rounded-xl bg-secondary/50 border border-border text-sm text-foreground">
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="mt-2 rounded-2xl border border-border/60 bg-card/95 p-2 shadow-luxury backdrop-blur">
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 rounded-xl">Cancel</Button>
          <Button type="submit" variant="glow" className="flex-1 rounded-xl" disabled={updateTrainer.isPending}>
            {updateTrainer.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export const EditTrainerDialog = ({ trainer, open, onOpenChange }: { trainer: Trainer | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const isMobile = useIsMobile();
  if (!trainer) return null;
  const close = () => onOpenChange(false);

  if (isMobile) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-border">
        <SheetHeader><SheetTitle>Edit Trainer</SheetTitle><SheetDescription>Update {trainer.name}'s details</SheetDescription></SheetHeader>
        <EditTrainerForm trainer={trainer} onClose={close} />
      </SheetContent>
    </Sheet>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border max-w-md">
        <DialogHeader><DialogTitle>Edit Trainer</DialogTitle><DialogDescription>Update {trainer.name}'s details</DialogDescription></DialogHeader>
        <EditTrainerForm trainer={trainer} onClose={close} />
      </DialogContent>
    </Dialog>
  );
};

// Assign members
const AssignMembersContent = ({ trainer, onClose }: { trainer: Trainer; onClose: () => void }) => {
  const { data: members = [] } = useMembers();
  const updateMember = useUpdateMember();
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();
  const [search, setSearch] = useState("");

  const assigned = members.filter(m => m.trainer_id === trainer.id);
  const unassigned = members.filter(m => !m.trainer_id && m.name.toLowerCase().includes(search.toLowerCase()));

  const assign = async (member: Member) => {
    try {
      if (isDemoMode) {
        await updateMember.mutateAsync({ id: member.id, trainer_id: trainer.id });
      } else {
        const { error } = await supabase.rpc("owner_set_member_trainer", {
          p_member_id: member.id,
          p_trainer_id: trainer.id,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to assign member");
    }
  };

  const remove = async (member: Member) => {
    try {
      if (isDemoMode) {
        await updateMember.mutateAsync({ id: member.id, trainer_id: null });
      } else {
        const { error } = await supabase.rpc("owner_set_member_trainer", {
          p_member_id: member.id,
          p_trainer_id: null,
        });
        if (error) throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to remove member");
    }
  };

  return (
    <div className="space-y-4 p-1">
      {assigned.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Assigned ({assigned.length})</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {assigned.map(m => (
              <div key={m.id} className="flex items-center justify-between bg-secondary/30 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {m.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                  </div>
                  <span className="text-xs font-medium capitalize">{m.name}</span>
                </div>
                <button onClick={() => remove(m)} className="p-1 rounded-lg hover:bg-destructive/10 transition-colors">
                  <X className="w-3.5 h-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Add Members</p>
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members..." className="h-9 rounded-xl bg-secondary/50 border-border text-xs" />
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {unassigned.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">No unassigned members found</p>
          ) : unassigned.map(m => (
            <div key={m.id} className="flex items-center justify-between bg-card border border-border rounded-xl px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                  {m.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                </div>
                <span className="text-xs font-medium capitalize">{m.name}</span>
              </div>
              <button onClick={() => assign(m)} className="p-1 rounded-lg hover:bg-primary/10 transition-colors">
                <UserPlus className="w-3.5 h-3.5 text-primary" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <Button variant="outline" onClick={onClose} className="w-full rounded-xl">Done</Button>
    </div>
  );
};

export const AssignMembersDialog = ({ trainer, open, onOpenChange }: { trainer: Trainer | null; open: boolean; onOpenChange: (v: boolean) => void }) => {
  const isMobile = useIsMobile();
  if (!trainer) return null;
  const close = () => onOpenChange(false);

  if (isMobile) return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl border-border">
        <SheetHeader><SheetTitle>Assign Members</SheetTitle><SheetDescription>Manage members for {trainer.name}</SheetDescription></SheetHeader>
        <AssignMembersContent trainer={trainer} onClose={close} />
      </SheetContent>
    </Sheet>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border-border max-w-md">
        <DialogHeader><DialogTitle>Assign Members</DialogTitle><DialogDescription>Manage members for {trainer.name}</DialogDescription></DialogHeader>
        <AssignMembersContent trainer={trainer} onClose={close} />
      </DialogContent>
    </Dialog>
  );
};

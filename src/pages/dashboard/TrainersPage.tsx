import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Users, Star, MoreHorizontal, Edit2, Phone, Eye, Trash2, UserPlus } from "lucide-react";
import { useTrainers, useDeleteTrainer, type Trainer } from "@/hooks/useTrainers";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";
import AddTrainerDialog from "@/components/dashboard/AddTrainerDialog";
import { ViewTrainerDialog, EditTrainerDialog, AssignMembersDialog } from "@/components/dashboard/TrainerDialogs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const TrainersPage = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewTrainer, setViewTrainer] = useState<Trainer | null>(null);
  const [editTrainer, setEditTrainer] = useState<Trainer | null>(null);
  const [assignTrainer, setAssignTrainer] = useState<Trainer | null>(null);
  const { data: trainers = [], isLoading } = useTrainers();
  const deleteTrainer = useDeleteTrainer();

  if (accessLoading) {
    return (
      <DashboardLayout title="Trainers" subtitle="Manage your trainer team">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (access.isLocked) {
    return (
      <DashboardLayout title="Trainers" subtitle="Manage your trainer team">
        <FeatureLock
          title="Plan Required"
          description="Your trial has ended. Choose a plan to unlock trainer management and continue using the platform."
        />
      </DashboardLayout>
    );
  }

  if (!access.features.trainers_manage) {
    return (
      <DashboardLayout title="Trainers" subtitle="Manage your trainer team">
        <FeatureLock
          title="Trainer Management Locked"
          description="Upgrade to Growth to add trainers, assign members, and track trainer performance."
        />
      </DashboardLayout>
    );
  }

  const filtered = trainers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) || (t.specialty || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout title="Trainers" subtitle={`${trainers.length} trainers on staff`}>
      <div className="flex gap-2 sm:gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search trainers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border rounded-xl" />
        </div>
        <Button variant="glow" size="sm" className="h-10 gap-1.5 rounded-xl" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Trainer</span><span className="sm:hidden">Add</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-sm text-muted-foreground">{trainers.length === 0 ? "No trainers yet. Add your first trainer!" : "No trainers found"}</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {filtered.map((t, i) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              whileTap={{ scale: 0.98 }} className="bg-card border border-border rounded-2xl p-4 sm:p-5 hover:border-primary/20 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-primary flex items-center justify-center text-sm font-bold text-primary-foreground flex-shrink-0">
                    {t.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-sm truncate">{t.name}</h3>
                    <p className="text-[10px] text-primary font-medium">{t.specialty || "General"}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1.5 rounded-lg hover:bg-secondary transition-colors flex-shrink-0">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-xl border-border">
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setViewTrainer(t)}><Eye className="w-4 h-4" /> View</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditTrainer(t)}><Edit2 className="w-4 h-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setAssignTrainer(t)}><UserPlus className="w-4 h-4" /> Assign Members</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="w-4 h-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Members</span>
                  <span className="text-xs font-semibold flex items-center gap-1"><Users className="w-3 h-3 text-muted-foreground" /> {t.members_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Rating</span>
                  <span className="text-xs font-semibold flex items-center gap-1"><Star className="w-3 h-3 text-glow-gold fill-glow-gold" /> {Number(t.rating).toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Schedule</span>
                  <span className="text-[10px] text-muted-foreground">{t.schedule || "--"}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  t.status === "active" ? "bg-primary/10 text-primary" : "bg-glow-gold/10 text-glow-gold"
                }`}>
                  {t.status === "active" ? "Active" : t.status === "on_leave" ? "On Leave" : "Inactive"}
                </span>
                <div className="flex gap-1">
                  {t.phone && <a href={`tel:${t.phone}`} className="p-1.5 rounded-lg hover:bg-secondary transition-colors"><Phone className="w-3.5 h-3.5 text-muted-foreground" /></a>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AddTrainerDialog open={addOpen} onOpenChange={setAddOpen} />
      <ViewTrainerDialog trainer={viewTrainer} open={!!viewTrainer} onOpenChange={(v) => !v && setViewTrainer(null)} />
      <EditTrainerDialog trainer={editTrainer} open={!!editTrainer} onOpenChange={(v) => !v && setEditTrainer(null)} />
      <AssignMembersDialog trainer={assignTrainer} open={!!assignTrainer} onOpenChange={(v) => !v && setAssignTrainer(null)} />
      
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trainer</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteTrainer.mutate(deleteId); setDeleteId(null); }}
              disabled={deleteTrainer.isPending}>
              {deleteTrainer.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default TrainersPage;

import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  MoreHorizontal,
  Building2,
  MapPin,
  Ban,
  CheckCircle,
  Copy,
  Mail,
  Pencil,
  Trash2,
  Layers,
  Eye,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, addYears, format } from "date-fns";
import { useAdminBaseData } from "@/hooks/useAdminData";
import { formatCurrencyINR } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { type Member } from "@/hooks/useMembers";

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  trial: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

const memberStatusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  trial: "bg-primary/10 text-primary border-primary/20",
  frozen: "bg-glow-gold/10 text-glow-gold border-glow-gold/20",
  expired: "bg-destructive/10 text-destructive border-destructive/20",
};

const formatDate = (value: string | null | undefined) => (value ? format(new Date(value), "MMM d, yyyy") : "—");

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase())
    .join("") || "GY";

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-border/60 bg-secondary/30 px-3 py-2 text-center">
    <p className="text-[10px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value}</p>
  </div>
);

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value || "—"}</p>
  </div>
);

type AdminMember = {
  id: string;
  gym_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: Member["status"];
  joined_at: string;
  created_at: string;
};

type GymRow = {
  id: string;
  name: string;
  owner: string;
  email: string;
  location: string;
  members: number;
  plan: string;
  status: string;
  isSuspended: boolean;
  mrr: string;
  joined: string;
  currentPlanId: string | null;
  planExpiresAt: string | null;
};

const AdminGyms = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { data, isLoading } = useAdminBaseData();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [newGym, setNewGym] = useState({
    name: "",
    ownerEmail: "",
    phone: "",
    address: "",
  });
  const [editForm, setEditForm] = useState({
    id: "",
    name: "",
    ownerEmail: "",
    phone: "",
    address: "",
  });
  const [planForm, setPlanForm] = useState({
    id: "",
    name: "",
    currentPlanId: "",
    planExpiresAt: "",
  });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedGym, setSelectedGym] = useState<GymRow | null>(null);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [memberDetailOpen, setMemberDetailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GymRow | null>(null);

  const gymsData = useMemo(() => {
    const gyms = data?.gyms ?? [];
    const members = data?.members ?? [];
    const profiles = data?.profiles ?? [];
    const plans = data?.plans ?? [];

    const membersByGym = members.reduce<Record<string, number>>((acc, m) => {
      acc[m.gym_id] = (acc[m.gym_id] || 0) + 1;
      return acc;
    }, {});

    const plansById = plans.reduce<Record<string, { name: string; price: number; billing_cycle: string }>>((acc, p) => {
      acc[p.id] = { name: p.name, price: Number(p.price || 0), billing_cycle: p.billing_cycle };
      return acc;
    }, {});

    const ownersById = profiles.reduce<Record<string, { name: string; email: string }>>((acc, p) => {
      acc[p.id] = {
        name: p.full_name || p.email || "-",
        email: p.email || "-",
      };
      return acc;
    }, {});

    const now = new Date();

    return gyms.map((gym) => {
      const owner = ownersById[gym.owner_id];
      const plan = gym.current_plan_id ? plansById[gym.current_plan_id] : null;
      const planPrice = plan ? plan.price : 0;
      const hasPlan = !!gym.current_plan_id;
      const isExpired = gym.plan_expires_at ? new Date(gym.plan_expires_at) < now : false;
      const isSuspended = !!gym.is_suspended;
      const status = isSuspended ? "suspended" : !hasPlan ? "trial" : isExpired ? "expired" : "active";

      return {
        id: gym.id,
        name: gym.name,
        owner: owner?.name || "-",
        email: owner?.email || "-",
        location: gym.address || "-",
        members: membersByGym[gym.id] || 0,
        plan: plan?.name || "Trial",
        status,
        isSuspended,
        mrr: planPrice ? formatCurrencyINR(planPrice) : formatCurrencyINR(0),
        joined: gym.created_at ? format(new Date(gym.created_at), "MMM yyyy") : "-",
        currentPlanId: gym.current_plan_id ?? null,
        planExpiresAt: gym.plan_expires_at ?? null,
      } as GymRow;
    });
  }, [data]);

  const filtered = gymsData.filter((g) => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const planOptions = data?.plans ?? [];

  const { data: gymMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["admin-gym-members", selectedGym?.id],
    queryFn: async (): Promise<AdminMember[]> => {
      if (!selectedGym?.id) return [];
      const { data: membersData, error } = await supabase
        .from("members")
        .select("id, gym_id, name, email, phone, status, joined_at, created_at")
        .eq("gym_id", selectedGym.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (membersData || []) as AdminMember[];
    },
    enabled: membersOpen && !!selectedGym?.id,
  });

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return gymMembers;
    return gymMembers.filter((m) => {
      return (
        m.name.toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.phone || "").toLowerCase().includes(term)
      );
    });
  }, [memberSearch, gymMembers]);

  const memberStats = useMemo(() => {
    const active = gymMembers.filter((m) => m.status === "active").length;
    return { total: gymMembers.length, active };
  }, [gymMembers]);

  const computeExpiry = (planId: string) => {
    const plan = planOptions.find((p) => p.id === planId);
    if (!plan) return "";
    const cycle = plan.billing_cycle?.toLowerCase() || "month";
    const now = new Date();
    if (cycle.includes("year")) return addYears(now, 1).toISOString();
    if (cycle.includes("week")) return addWeeks(now, 1).toISOString();
    if (cycle.includes("day")) return addDays(now, 30).toISOString();
    return addMonths(now, 1).toISOString();
  };

  const createGymMutation = useMutation({
    mutationFn: async () => {
      const name = newGym.name.trim();
      const ownerEmail = newGym.ownerEmail.trim().toLowerCase();
      if (!name || !ownerEmail) {
        throw new Error("Gym name and owner email are required.");
      }

      const { data: owner, error: ownerError } = await supabase
        .from("profiles")
        .select("id, email, full_name, gym_id")
        .ilike("email", ownerEmail)
        .maybeSingle();

      if (ownerError) throw ownerError;
      if (!owner) throw new Error("Owner account not found. Ask them to sign up first.");

      const { data: gymRow, error: gymError } = await supabase
        .from("gyms")
        .insert({
          name,
          owner_id: owner.id,
          phone: newGym.phone.trim() || null,
          address: newGym.address.trim() || null,
        })
        .select("id, name")
        .single();

      if (gymError) throw gymError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ gym_id: gymRow.id })
        .eq("id", owner.id);
      if (profileError) throw profileError;

      const { data: roleRow, error: roleError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", owner.id)
        .eq("role", "owner")
        .eq("gym_id", gymRow.id)
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleRow) {
        const { error: insertRoleError } = await supabase
          .from("user_roles")
          .insert({ user_id: owner.id, role: "owner", gym_id: gymRow.id });
        if (insertRoleError) throw insertRoleError;
      }

      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: "gym.created",
        category: "gym",
        target_id: gymRow.id,
        target_label: gymRow.name,
        detail: `Created gym for ${owner.email || ownerEmail}`,
        severity: "low",
        metadata: { owner_id: owner.id, owner_email: owner.email || ownerEmail },
      });

      return gymRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-base-data"] });
      setAddOpen(false);
      setNewGym({ name: "", ownerEmail: "", phone: "", address: "" });
      toast.success("Gym created");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to create gym"),
  });

  const editGymMutation = useMutation({
    mutationFn: async () => {
      if (!editForm.id) throw new Error("Missing gym");
      const { error } = await supabase
        .from("gyms")
        .update({
          name: editForm.name.trim(),
          address: editForm.address.trim() || null,
          phone: editForm.phone.trim() || null,
        })
        .eq("id", editForm.id);
      if (error) throw error;

      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: "gym.updated",
        category: "gym",
        target_id: editForm.id,
        target_label: editForm.name,
        detail: "Updated gym details",
        severity: "low",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-base-data"] });
      setEditOpen(false);
      toast.success("Gym updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update gym"),
  });

  const planMutation = useMutation({
    mutationFn: async () => {
      if (!planForm.id) throw new Error("Missing gym");
      const planId = planForm.currentPlanId || null;
      const expiresAt = planId ? computeExpiry(planId) : null;
      const { error } = await supabase
        .from("gyms")
        .update({ current_plan_id: planId, plan_expires_at: expiresAt })
        .eq("id", planForm.id);
      if (error) throw error;

      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: "gym.plan_assigned",
        category: "billing",
        target_id: planForm.id,
        target_label: planForm.name,
        detail: planId ? "Assigned plan" : "Set gym to trial",
        severity: "low",
        metadata: { plan_id: planId, plan_expires_at: expiresAt },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-base-data"] });
      setPlanOpen(false);
      toast.success("Plan updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to update plan"),
  });

  const deleteGymMutation = useMutation({
    mutationFn: async (gym: GymRow) => {
      const deletedAt = new Date().toISOString();
      const { error } = await supabase
        .from("gyms")
        .update({ deleted_at: deletedAt, is_suspended: true })
        .eq("id", gym.id);
      if (error) throw error;
      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: "gym.archived",
        category: "gym",
        target_id: gym.id,
        target_label: gym.name,
        detail: "Archived gym (soft delete)",
        severity: "high",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-base-data"] });
      setDeleteOpen(false);
      setDeleteTarget(null);
      toast.success("Gym archived");
    },
    onError: () => toast.error("Failed to archive gym"),
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async (gym: { id: string; name: string; isSuspended: boolean }) => {
      const { error } = await supabase
        .from("gyms")
        .update({ is_suspended: !gym.isSuspended })
        .eq("id", gym.id);
      if (error) throw error;

      await supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: gym.isSuspended ? "gym.reactivated" : "gym.suspended",
        category: "gym",
        target_id: gym.id,
        target_label: gym.name,
        detail: gym.isSuspended ? "Reactivated gym access" : "Suspended gym access",
        severity: "medium",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-base-data"] });
      toast.success("Gym status updated");
    },
    onError: () => toast.error("Failed to update gym status"),
  });

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  };

  const openEdit = (gym: GymRow) => {
    setEditForm({
      id: gym.id,
      name: gym.name,
      ownerEmail: gym.email,
      phone: data?.gyms.find((g) => g.id === gym.id)?.phone || "",
      address: data?.gyms.find((g) => g.id === gym.id)?.address || "",
    });
    setDetailsOpen(false);
    setEditOpen(true);
  };

  const openPlan = (gym: GymRow) => {
    setPlanForm({
      id: gym.id,
      name: gym.name,
      currentPlanId: gym.currentPlanId || "",
      planExpiresAt: gym.planExpiresAt || "",
    });
    setDetailsOpen(false);
    setPlanOpen(true);
  };

  const openDetails = (gym: GymRow) => {
    setSelectedGym(gym);
    setDetailsOpen(true);
  };

  const openMembers = (gym: GymRow) => {
    setSelectedGym(gym);
    setMemberSearch("");
    setSelectedMember(null);
    setMemberDetailOpen(false);
    setDetailsOpen(false);
    setMembersOpen(true);
  };

  const handleMemberDetailChange = (open: boolean) => {
    setMemberDetailOpen(open);
    if (!open) setSelectedMember(null);
  };

  const requestDelete = (gym: GymRow) => {
    setDeleteTarget(gym);
    setDeleteOpen(true);
  };

  return (
    <SuperAdminLayout title="Gym Management" subtitle="View, manage, and moderate all registered gyms">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search gyms or owners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/30 border-border" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary/30 border border-border text-sm text-foreground">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="expired">Expired</option>
          <option value="suspended">Suspended</option>
        </select>
        <Button className="bg-primary text-primary-foreground gap-2" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add Gym
        </Button>
      </div>

      <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
        {isLoading && (
          <div className="p-6 text-sm text-muted-foreground">Loading gyms...</div>
        )}
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="p-4 text-xs font-semibold text-muted-foreground">Gym</th>
              <th className="p-4 text-xs font-semibold text-muted-foreground">Owner</th>
              <th className="p-4 text-xs font-semibold text-muted-foreground">Location</th>
              <th className="p-4 text-xs font-semibold text-muted-foreground">Members</th>
              <th className="p-4 text-xs font-semibold text-muted-foreground">Plan</th>
              <th className="p-4 text-xs font-semibold text-muted-foreground">MRR</th>
              <th className="p-4 text-xs font-semibold text-muted-foreground">Status</th>
              <th className="p-4 text-xs font-semibold text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="p-6 text-sm text-muted-foreground">
                  No gyms found.
                </td>
              </tr>
            )}
            {filtered.map((gym, i) => (
              <motion.tr
                key={gym.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-border/50 hover:bg-secondary/20 transition-colors cursor-pointer"
                onClick={() => openDetails(gym)}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-4 h-4 text-primary" /></div>
                    <div>
                      <p className="text-sm font-semibold">{gym.name}</p>
                      <p className="text-[10px] text-muted-foreground">Joined {gym.joined}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <p className="text-sm">{gym.owner}</p>
                  <p className="text-[10px] text-muted-foreground">{gym.email}</p>
                </td>
                <td className="p-4 text-sm text-muted-foreground"><div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{gym.location}</div></td>
                <td className="p-4 text-sm font-medium">{gym.members}</td>
                <td className="p-4"><Badge variant="outline" className="text-[10px]">{gym.plan}</Badge></td>
                <td className="p-4 text-sm font-semibold text-accent">{gym.mrr}</td>
                <td className="p-4"><span className={`text-[10px] px-2 py-1 rounded-full border font-semibold capitalize ${statusColors[gym.status]}`}>{gym.status}</span></td>
                <td className="p-4">
                  <div className="flex items-center gap-1">
                    {gym.status === "suspended" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSuspendMutation.mutate({ id: gym.id, name: gym.name, isSuspended: true });
                        }}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSuspendMutation.mutate({ id: gym.id, name: gym.name, isSuspended: false });
                        }}
                      >
                        <Ban className="w-4 h-4" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            openDetails(gym);
                          }}
                        >
                          <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            openMembers(gym);
                          }}
                        >
                          <Users className="w-3.5 h-3.5 mr-2" /> View Members
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            openEdit(gym);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Gym
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            openPlan(gym);
                          }}
                        >
                          <Layers className="w-3.5 h-3.5 mr-2" /> Assign Plan
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCopy(gym.id, "Gym ID");
                          }}
                        >
                          <Copy className="w-3.5 h-3.5 mr-2" /> Copy Gym ID
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(event) => {
                            event.stopPropagation();
                            handleCopy(gym.email, "Owner email");
                          }}
                        >
                          <Mail className="w-3.5 h-3.5 mr-2" /> Copy Owner Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onSelect={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            requestDelete(gym);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Archive Gym
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-3">
        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Loading gyms...</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No gyms found.</div>
        )}
        {filtered.map((gym, i) => (
          <motion.div
            key={gym.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-2xl p-4 cursor-pointer"
            onClick={() => openDetails(gym)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-primary" /></div>
                <div>
                  <p className="font-semibold">{gym.name}</p>
                  <p className="text-xs text-muted-foreground">{gym.owner}</p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full border font-semibold capitalize ${statusColors[gym.status]}`}>{gym.status}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-secondary/30 rounded-xl p-2">
                <p className="text-xs text-muted-foreground">Members</p>
                <p className="font-bold text-sm">{gym.members}</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-2">
                <p className="text-xs text-muted-foreground">Plan</p>
                <p className="font-bold text-sm">{gym.plan}</p>
              </div>
              <div className="bg-secondary/30 rounded-xl p-2">
                <p className="text-xs text-muted-foreground">MRR</p>
                <p className="font-bold text-sm text-accent">{gym.mrr}</p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 mt-3">
              <Button
                size="sm"
                variant="ghost"
                className={`h-8 px-3 text-xs ${gym.isSuspended ? "text-emerald-400" : "text-destructive"}`}
                onClick={(event) => {
                  event.stopPropagation();
                  toggleSuspendMutation.mutate({ id: gym.id, name: gym.name, isSuspended: gym.isSuspended });
                }}
              >
                {gym.isSuspended ? <CheckCircle className="w-3.5 h-3.5 mr-1" /> : <Ban className="w-3.5 h-3.5 mr-1" />}
                {gym.isSuspended ? "Reactivate" : "Suspend"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreHorizontal className="w-3.5 h-3.5 mr-1" /> Actions
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      openDetails(gym);
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      openMembers(gym);
                    }}
                  >
                    <Users className="w-3.5 h-3.5 mr-2" /> View Members
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      openEdit(gym);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Gym
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      openPlan(gym);
                    }}
                  >
                    <Layers className="w-3.5 h-3.5 mr-2" /> Assign Plan
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.stopPropagation();
                      handleCopy(gym.id, "Gym ID");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 mr-2" /> Copy Gym ID
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      requestDelete(gym);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Archive Gym
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Gym</DialogTitle>
            <DialogDescription>Create a gym for an existing owner account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Gym Name</label>
              <Input
                value={newGym.name}
                onChange={(e) => setNewGym((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Gym name"
                className="mt-1 bg-secondary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Owner Email</label>
              <Input
                value={newGym.ownerEmail}
                onChange={(e) => setNewGym((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder="owner@example.com"
                className="mt-1 bg-secondary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input
                value={newGym.phone}
                onChange={(e) => setNewGym((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="+91 98765 43210"
                className="mt-1 bg-secondary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Address</label>
              <Input
                value={newGym.address}
                onChange={(e) => setNewGym((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Gym address"
                className="mt-1 bg-secondary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={createGymMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => createGymMutation.mutate()} disabled={createGymMutation.isPending}>
              {createGymMutation.isPending ? "Creating..." : "Create Gym"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Gym</DialogTitle>
            <DialogDescription>Update gym name, phone, or address.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Gym Name</label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 bg-secondary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Owner Email</label>
              <Input value={editForm.ownerEmail} disabled className="mt-1 bg-secondary/30" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone</label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                className="mt-1 bg-secondary/30"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Address</label>
              <Input
                value={editForm.address}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                className="mt-1 bg-secondary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editGymMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => editGymMutation.mutate()} disabled={editGymMutation.isPending}>
              {editGymMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Plan</DialogTitle>
            <DialogDescription>Update platform plan for {planForm.name}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Plan</label>
              <Select value={planForm.currentPlanId} onValueChange={(value) => setPlanForm((prev) => ({ ...prev, currentPlanId: value }))}>
                <SelectTrigger className="mt-1 bg-secondary/30">
                  <SelectValue placeholder="Select plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Trial (no plan)</SelectItem>
                  {planOptions.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - {formatCurrencyINR(Number(plan.price || 0))}/{plan.billing_cycle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Next Renewal</label>
              <Input
                value={planForm.currentPlanId ? format(new Date(computeExpiry(planForm.currentPlanId)), "dd MMM yyyy") : "Trial"}
                disabled
                className="mt-1 bg-secondary/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanOpen(false)} disabled={planMutation.isPending}>
              Cancel
            </Button>
            <Button onClick={() => planMutation.mutate()} disabled={planMutation.isPending}>
              {planMutation.isPending ? "Saving..." : "Update Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedGym(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gym Details</DialogTitle>
            <DialogDescription>Complete profile and billing snapshot.</DialogDescription>
          </DialogHeader>
          {selectedGym ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {getInitials(selectedGym.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedGym.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedGym.owner}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedGym.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <StatPill label="Members" value={selectedGym.members.toString()} />
                <StatPill label="Plan" value={selectedGym.plan} />
                <StatPill label="MRR" value={selectedGym.mrr} />
                <StatPill label="Joined" value={selectedGym.joined} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <InfoCell label="Status" value={selectedGym.status} />
                <InfoCell label="Plan Expires" value={selectedGym.planExpiresAt ? formatDate(selectedGym.planExpiresAt) : "—"} />
                <InfoCell label="Phone" value={data?.gyms.find((g) => g.id === selectedGym.id)?.phone || "-"} />
                <InfoCell label="Address" value={data?.gyms.find((g) => g.id === selectedGym.id)?.address || "-"} />
                <InfoCell label="Gym ID" value={selectedGym.id} />
              </div>

              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
                <Button variant="outline" onClick={() => openEdit(selectedGym)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit Gym
                </Button>
                <Button onClick={() => openPlan(selectedGym)}>
                  <Layers className="w-4 h-4 mr-2" /> Assign Plan
                </Button>
                <Button variant="glow" onClick={() => openMembers(selectedGym)}>
                  <Users className="w-4 h-4 mr-2" /> View Members
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No gym selected.</div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={membersOpen}
        onOpenChange={(open) => {
          setMembersOpen(open);
          if (!open) {
            setMemberSearch("");
            setSelectedMember(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Gym Members</DialogTitle>
            <DialogDescription>
              {selectedGym?.name || "Gym"} members overview.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members by name, email, phone..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 bg-secondary/30 border-border"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatPill label="Total" value={memberStats.total.toString()} />
              <StatPill label="Active" value={memberStats.active.toString()} />
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {membersLoading && (
              <div className="p-4 text-sm text-muted-foreground">Loading members...</div>
            )}
            {!membersLoading && filteredMembers.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No members found.</div>
            )}
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{member.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${memberStatusColors[member.status] || "border-border text-muted-foreground"}`}>
                        {member.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {(member.email || "No email")}
                      {member.phone ? ` · ${member.phone}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Joined {formatDate(member.joined_at)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3"
                    onClick={() => {
                      setSelectedMember(member);
                      setMemberDetailOpen(true);
                    }}
                  >
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {deleteTarget?.name ?? "gym"}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive the gym so it no longer appears in active lists. Data stays in the database and user profiles are not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col gap-2 sm:items-end">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteTarget && deleteGymMutation.mutate(deleteTarget)}
                disabled={deleteGymMutation.isPending}
              >
                {deleteGymMutation.isPending ? "Archiving..." : "Archive Gym"}
              </AlertDialogAction>
            </div>
            <p className="text-[11px] text-muted-foreground">
              You can restore the gym later by clearing the archive flag in the database.
            </p>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminMemberDetailDialog
        member={selectedMember}
        open={memberDetailOpen}
        onOpenChange={handleMemberDetailChange}
      />
    </SuperAdminLayout>
  );
};

interface AdminMemberDetailDialogProps {
  member: AdminMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AdminMemberDetailDialog = ({ member, open, onOpenChange }: AdminMemberDetailDialogProps) => {
  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Member Details</DialogTitle>
          <DialogDescription>Basic profile information.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
              {getInitials(member.name)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{member.name}</p>
              <p className="text-xs text-muted-foreground truncate">{member.email || "No email"}</p>
              {member.phone && <p className="text-xs text-muted-foreground truncate">{member.phone}</p>}
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <InfoCell label="Status" value={member.status.charAt(0).toUpperCase() + member.status.slice(1)} />
            <InfoCell label="Joined" value={formatDate(member.joined_at)} />
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AdminGyms;

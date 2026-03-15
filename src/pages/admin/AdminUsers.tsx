import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, UserCog, Shield, User, Ban, CheckCircle, MoreHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useAdminBaseData } from "@/hooks/useAdminData";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { type Member } from "@/hooks/useMembers";
import { format } from "date-fns";
import { formatCurrencyINR } from "@/lib/currency";

const roleIcons: Record<string, typeof User> = { super_admin: Shield, gym_owner: UserCog, trainer: UserCog, member: User };
const roleColors: Record<string, string> = {
  super_admin: "bg-destructive/10 text-destructive border-destructive/20",
  gym_owner: "bg-primary/10 text-primary border-primary/20",
  trainer: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  member: "bg-secondary text-muted-foreground border-border",
};
const statusColors: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  banned: "bg-destructive/10 text-destructive",
};

type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  gymId: string | null;
  gymName: string;
  gymAddress: string;
  gymPhone: string;
  planName: string;
  planExpiresAt: string | null;
  membersTotal: number;
  joinedAt: string;
  status: "active" | "banned";
  lastLogin: string;
};

const InfoCell = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-[11px] text-muted-foreground">{label}</p>
    <p className="text-sm font-semibold">{value || "—"}</p>
  </div>
);

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

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("member");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedOwner, setSelectedOwner] = useState<AdminUserRow | null>(null);
  const { data, isLoading } = useAdminBaseData();

  const usersData = useMemo<AdminUserRow[]>(() => {
    const profiles = data?.profiles ?? [];
    const roles = data?.roles ?? [];
    const gyms = data?.gyms ?? [];
    const members = data?.members ?? [];
    const plans = data?.plans ?? [];

    const gymById = gyms.reduce<Record<string, (typeof gyms)[number]>>((acc, g) => {
      acc[g.id] = g;
      return acc;
    }, {});

    const gymByOwnerId = gyms.reduce<Record<string, (typeof gyms)[number]>>((acc, g) => {
      acc[g.owner_id] = g;
      return acc;
    }, {});

    const membersByGym = members.reduce<Record<string, number>>((acc, m) => {
      acc[m.gym_id] = (acc[m.gym_id] || 0) + 1;
      return acc;
    }, {});

    const plansById = plans.reduce<Record<string, { name: string }>>((acc, p) => {
      acc[p.id] = { name: p.name };
      return acc;
    }, {});

    const rolesByUser = roles.reduce<Record<string, string[]>>((acc, r) => {
      if (!acc[r.user_id]) acc[r.user_id] = [];
      acc[r.user_id].push(r.role);
      return acc;
    }, {});

    const pickRole = (list: string[]) => {
      if (list.includes("super_admin")) return "super_admin";
      if (list.includes("owner")) return "gym_owner";
      if (list.includes("trainer")) return "trainer";
      if (list.includes("member")) return "member";
      return "member";
    };

    return profiles.map((p) => {
      const role = pickRole(rolesByUser[p.id] || []);
      const ownerGym = role === "gym_owner" ? gymByOwnerId[p.id] : undefined;
      const gym = ownerGym ?? (p.gym_id ? gymById[p.gym_id] : undefined);
      const gymId = role === "super_admin" ? null : gym?.id ?? p.gym_id ?? null;
      const gymName = role === "super_admin" ? "-" : gym?.name ?? "-";
      const planName = gym?.current_plan_id ? plansById[gym.current_plan_id]?.name ?? "Trial" : "Trial";
      const planExpiresAt = gym?.plan_expires_at ?? null;
      const membersTotal = gymId ? membersByGym[gymId] || 0 : 0;
      const joinedAt = gym?.created_at ?? p.created_at;

      return {
        id: p.id,
        name: p.full_name || p.email || "-",
        email: p.email || "-",
        role,
        gymId,
        gymName,
        gymAddress: gym?.address || "-",
        gymPhone: gym?.phone || "-",
        planName,
        planExpiresAt,
        membersTotal,
        joinedAt,
        status: "active",
        lastLogin: "-",
      };
    }).filter((row) => row.role !== "super_admin");
  }, [data]);

  const filtered = usersData.filter((u) => {
    const term = search.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.gymName.toLowerCase().includes(term);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const { data: ownerMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ["admin-owner-members", selectedOwner?.gymId],
    queryFn: async (): Promise<Member[]> => {
      if (!selectedOwner?.gymId) return [];
      const { data: membersData, error } = await supabase
        .from("members")
        .select("id, gym_id, name, email, phone, plan_id, plan_name, trainer_id, status, joined_at, expiry_at, due_amount, last_payment, payment_status, payment_method, payment_date, last_checkin, created_at")
        .eq("gym_id", selectedOwner.gymId)
        .not("user_id", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (membersData || []) as Member[];
    },
    enabled: membersOpen && !!selectedOwner?.gymId,
  });

  const filteredMembers = useMemo(() => {
    const term = memberSearch.trim().toLowerCase();
    if (!term) return ownerMembers;
    return ownerMembers.filter((m) => {
      return (
        m.name.toLowerCase().includes(term) ||
        (m.email || "").toLowerCase().includes(term) ||
        (m.phone || "").toLowerCase().includes(term)
      );
    });
  }, [memberSearch, ownerMembers]);

  const openOwnerDetails = (user: AdminUserRow) => {
    setSelectedOwner(user);
    setDetailsOpen(true);
  };

  const openOwnerMembers = (user: AdminUserRow) => {
    setSelectedOwner(user);
    setMemberSearch("");
    setMembersOpen(true);
  };

  return (
    <SuperAdminLayout title="User Management" subtitle="Manage all platform users and their roles">
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-secondary/30 border-border" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 rounded-xl bg-secondary/30 border border-border text-sm text-foreground">
          <option value="all">All Roles</option>
          <option value="gym_owner">Gym Owner</option>
          <option value="trainer">Trainer</option>
          <option value="member">Member</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Gym Owners", count: usersData.filter((u) => u.role === "gym_owner").length, color: "text-primary" },
          { label: "Trainers", count: usersData.filter((u) => u.role === "trainer").length, color: "text-amber-400" },
          { label: "Members", count: usersData.filter((u) => u.role === "member").length, color: "text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className={`text-2xl font-display font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading && (
          <div className="p-4 text-sm text-muted-foreground">Loading users...</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">No users found.</div>
        )}
        {filtered.map((user, i) => {
          const RoleIcon = roleIcons[user.role] || User;
          const isOwner = user.role === "gym_owner" && !!user.gymId;
          const initials = getInitials(user.name);

          return (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:bg-secondary/20 transition-colors"
            >
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary">
                  {isOwner ? initials : <RoleIcon className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{user.name}</p>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold ${roleColors[user.role]}`}>
                      {user.role.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className={`text-[10px] px-2 py-0.5 font-semibold border-border/60 ${statusColors[user.status]}`}>
                      {user.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {user.email} · {user.gymName}
                  </p>
                  {isOwner ? (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <StatPill label="Members" value={user.membersTotal.toString()} />
                      <StatPill label="Plan" value={user.planName} />
                      <StatPill label="Joined" value={formatDate(user.joinedAt)} />
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground mt-2">Last login: {user.lastLogin}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                {isOwner ? (
                  <>
                    <Button size="sm" variant="outline" className="h-9 px-3" onClick={() => openOwnerDetails(user)}>
                      View Details
                    </Button>
                    <Button size="sm" variant="glow" className="h-9 px-3" onClick={() => openOwnerMembers(user)}>
                      Members
                    </Button>
                  </>
                ) : null}
                {user.status === "banned" ? (
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-emerald-400">
                    <CheckCircle className="w-4 h-4" />
                  </Button>
                ) : user.role !== "super_admin" ? (
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive">
                    <Ban className="w-4 h-4" />
                  </Button>
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-9 w-9 p-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem disabled className="text-muted-foreground">
                      More actions coming soon
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setSelectedOwner(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Owner Details</DialogTitle>
            <DialogDescription>Gym profile, plan, and member summary.</DialogDescription>
          </DialogHeader>
          {selectedOwner ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {getInitials(selectedOwner.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedOwner.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedOwner.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{selectedOwner.gymName}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <StatPill label="Members" value={selectedOwner.membersTotal.toString()} />
                <StatPill label="Plan" value={selectedOwner.planName} />
                <StatPill label="Joined" value={formatDate(selectedOwner.joinedAt)} />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <InfoCell label="Plan Expires" value={selectedOwner.planName === "Trial" ? "—" : formatDate(selectedOwner.planExpiresAt)} />
                <InfoCell label="Phone" value={selectedOwner.gymPhone} />
                <InfoCell label="Address" value={selectedOwner.gymAddress} />
                <InfoCell label="Gym ID" value={selectedOwner.gymId || "—"} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No owner selected.</div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={membersOpen}
        onOpenChange={(open) => {
          setMembersOpen(open);
          if (!open) setMemberSearch("");
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Logged-in Members</DialogTitle>
            <DialogDescription>
              {selectedOwner?.gymName || "Gym"} members with active accounts.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search members..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className="pl-9 bg-secondary/30 border-border"
              />
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground flex items-center">
              Logged-in: <span className="ml-1 font-semibold text-foreground">{ownerMembers.length}</span>
              <span className="mx-2">/</span>
              Total: <span className="ml-1 font-semibold text-foreground">{selectedOwner?.membersTotal ?? 0}</span>
            </div>
          </div>

          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {membersLoading && (
              <div className="p-4 text-sm text-muted-foreground">Loading members...</div>
            )}
            {!membersLoading && filteredMembers.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No logged-in members found.</div>
            )}
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {getInitials(member.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold truncate">{member.name}</p>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 capitalize text-muted-foreground">
                        {member.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5">
                        Plan: {member.plan_name || "No plan"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {(member.email || "No email")}
                      {member.phone ? ` · ${member.phone}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Due: {formatCurrencyINR(member.due_amount)}</span>
                      <span>Last check-in: {formatDate(member.last_checkin)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default AdminUsers;

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search, Plus, MoreHorizontal,
  Eye, Edit2, CreditCard, ChevronRight, Trash2, PackagePlus, Lock, Link2
} from "lucide-react";
import MemberDetailSheet, { EditMemberDialog, CollectPaymentDialog } from "@/components/dashboard/MemberDetailSheet";
import AddMemberDialog from "@/components/dashboard/AddMemberDialog";
import AddSubscriptionDialog from "@/components/dashboard/AddSubscriptionDialog";
import SendPaymentLinkDialog from "@/components/dashboard/SendPaymentLinkDialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useDeleteMember, useMembersPage, type Member } from "@/hooks/useMembers";
import { useGymAccess } from "@/hooks/useGymAccess";
import FeatureLock from "@/components/FeatureLock";
import { format } from "date-fns";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { formatCurrencyINR } from "@/lib/currency";

const statusColors: Record<string, string> = {
  active: "bg-primary/10 text-primary",
  expired: "bg-destructive/10 text-destructive",
  frozen: "bg-glow-gold/10 text-glow-gold",
  trial: "bg-glow-cyan/10 text-glow-cyan",
};

const paymentBadge = (m: Member) => {
  const hasPlan = !!m.plan_name?.trim();
  if (!hasPlan) return { text: "No plan", cls: "text-muted-foreground" };
  if (m.payment_status === "paid" && m.due_amount === 0) return { text: "Paid", cls: "text-primary" };
  if (m.payment_status === "pending") return { text: "Pending", cls: "text-glow-gold" };
  if (m.payment_status === "overdue") return { text: formatCurrencyINR(m.due_amount), cls: "text-destructive font-mono" };
  if (m.payment_status === "partial") return { text: `${formatCurrencyINR(m.due_amount)} due`, cls: "text-glow-gold font-mono" };
  return { text: m.payment_status, cls: "text-muted-foreground" };
};

const formatDate = (d: string | null) => (d ? format(new Date(d), "MMM d, yyyy") : "--");
const formatCheckin = (d: string | null) => {
  if (!d) return "Never";
  const date = new Date(d);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 86400000) return `Today, ${format(date, "h:mm a")}`;
  if (diff < 172800000) return "Yesterday";
  return format(date, "MMM d");
};

const MembersPage = () => {
  const { access, isLoading: accessLoading } = useGymAccess();
  const canCollectPayments = access.features.payments_collect;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [viewMember, setViewMember] = useState<Member | null>(null);
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [payMember, setPayMember] = useState<Member | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [subMember, setSubMember] = useState<Member | null>(null);
  const [payLinkMember, setPayLinkMember] = useState<Member | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data: memberPage, isLoading } = useMembersPage({
    search,
    status: statusFilter as Member["status"] | "all",
    page,
    pageSize,
  });
  const members = memberPage?.rows || [];
  const totalMembers = memberPage?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalMembers / pageSize));
  const deleteMember = useDeleteMember();

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  if (accessLoading) {
    return (
      <DashboardLayout title="Members" subtitle="Manage your gym members">
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (access.isLocked) {
    return (
      <DashboardLayout title="Members" subtitle="Manage your gym members">
        <FeatureLock
          title="Plan Required"
          description="Your trial has ended. Choose a plan to unlock member management and continue using the platform."
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Members" subtitle={`${totalMembers} total members`}>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 bg-card border-border rounded-xl" />
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary flex-1 sm:flex-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="frozen">Frozen</option>
          </select>
          <Button variant="glow" size="sm" className="h-10 gap-1.5 rounded-xl" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Member</span><span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-card border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-[11px] text-muted-foreground font-medium px-5 py-3 uppercase tracking-wider">Member</th>
                  <th className="text-left text-[11px] text-muted-foreground font-medium px-5 py-3 uppercase tracking-wider">Plan</th>
                  <th className="text-left text-[11px] text-muted-foreground font-medium px-5 py-3 uppercase tracking-wider">Status</th>
                  <th className="text-left text-[11px] text-muted-foreground font-medium px-5 py-3 uppercase tracking-wider">Payment</th>
                  <th className="text-left text-[11px] text-muted-foreground font-medium px-5 py-3 uppercase tracking-wider">Joined</th>
                  <th className="text-right text-[11px] text-muted-foreground font-medium px-5 py-3 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const badge = paymentBadge(m);
                  return (
                    <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary">
                            {m.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium capitalize">{m.name}</p>
                            <p className="text-xs text-muted-foreground">{m.email || "--"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm bg-secondary/60 px-3 py-1 rounded-md">{m.plan_name || "No plan"}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium flex items-center gap-1.5 ${
                          m.status === "active" ? "text-primary" : m.status === "expired" ? "text-destructive" : "text-glow-gold"
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${
                            m.status === "active" ? "bg-primary" : m.status === "expired" ? "bg-destructive" : "bg-glow-gold"
                          }`} />
                          {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-medium ${badge.cls}`}>{badge.text}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">{formatDate(m.joined_at)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-lg hover:bg-secondary"><MoreHorizontal className="w-4 h-4 text-muted-foreground" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-border">
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setViewMember(m)}><Eye className="w-4 h-4" /> View</DropdownMenuItem>
                            {!m.plan_name?.trim() ? (
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setSubMember(m)}><PackagePlus className="w-4 h-4" /> Add Subscription</DropdownMenuItem>
                            ) : m.payment_status !== "paid" || m.due_amount > 0 ? (
                              canCollectPayments ? (
                                <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setPayMember(m)}><CreditCard className="w-4 h-4" /> Collect Payment</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="gap-2 cursor-not-allowed opacity-60">
                                  <Lock className="w-4 h-4" /> Collect Payment (Upgrade)
                                </DropdownMenuItem>
                              )
                            ) : null}
                            {m.plan_name?.trim() && m.due_amount > 0 && (
                              <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setPayLinkMember(m)}>
                                <Link2 className="w-4 h-4" /> Send Payment Link
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => setEditMember(m)}><Edit2 className="w-4 h-4" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive" onClick={() => setDeleteId(m.id)}>
                              <Trash2 className="w-4 h-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {members.length === 0 && (
              <div className="text-center py-12"><p className="text-sm text-muted-foreground">{totalMembers === 0 ? "No members yet. Add your first member!" : "No members found"}</p></div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-2.5">
            <div className="grid grid-cols-2 gap-2 mb-1">
              {[
                { label: "Active", count: members.filter(m => m.status === "active").length, color: "text-primary" },
                { label: "Pending", count: members.filter(m => m.payment_status === "pending").length, color: "text-glow-gold" },
                { label: "Expired", count: members.filter(m => m.status === "expired").length, color: "text-destructive" },
                { label: "No Plan", count: members.filter(m => !m.plan_name?.trim()).length, color: "text-muted-foreground" },
              ].map(s => (
                <div key={s.label} className="bg-card border border-border rounded-xl p-2.5 text-center">
                  <p className={`font-display font-bold text-base ${s.color}`}>{s.count}</p>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>

            {members.map((m, i) => {
              const badge = paymentBadge(m);
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  whileTap={{ scale: 0.98 }} className="bg-card border border-border rounded-2xl overflow-hidden"
                  onClick={() => setSelectedMember(selectedMember === m.id ? null : m.id)}>
                  <div className="p-3.5 flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {m.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        m.status === "active" ? "bg-primary" : m.status === "expired" ? "bg-destructive" : "bg-glow-gold"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate capitalize">{m.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{m.plan_name || "No plan"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-[11px] font-medium ${badge.cls}`}>{badge.text}</p>
                      {m.plan_name?.trim() && <p className="text-[8px] text-muted-foreground mt-0.5">{formatCheckin(m.last_checkin)}</p>}
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0 transition-transform ${selectedMember === m.id ? "rotate-90" : ""}`} />
                  </div>

                  {selectedMember === m.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border/50">
                      <div className="grid grid-cols-3 gap-px bg-border/30">
                        <div className="bg-card p-2.5 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Phone</p>
                          <p className="text-[10px] font-medium mt-0.5">{m.phone || "--"}</p>
                        </div>
                        <div className="bg-card p-2.5 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Joined</p>
                          <p className="text-[10px] font-medium mt-0.5">{formatDate(m.joined_at)}</p>
                        </div>
                        <div className="bg-card p-2.5 text-center">
                          <p className="text-[8px] text-muted-foreground uppercase tracking-wider">Status</p>
                          <span className={`text-[9px] font-bold ${statusColors[m.status]} px-1.5 py-0.5 rounded-full inline-block mt-0.5`}>{m.status}</span>
                        </div>
                      </div>
                      <div className="p-2.5 grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-border gap-1.5"
                          onClick={(e) => { e.stopPropagation(); setViewMember(m); }}><Eye className="w-3 h-3" /> View</Button>
                        {!m.plan_name?.trim() ? (
                          <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-border gap-1.5"
                            onClick={(e) => { e.stopPropagation(); setSubMember(m); }}><PackagePlus className="w-3 h-3" /> Add Subscription</Button>
                        ) : m.payment_status !== "paid" || m.due_amount > 0 ? (
                          canCollectPayments ? (
                            <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-border gap-1.5"
                              onClick={(e) => { e.stopPropagation(); setPayMember(m); }}><CreditCard className="w-3 h-3" /> Collect Payment</Button>
                          ) : (
                            <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-border gap-1.5 opacity-60" disabled>
                              <Lock className="w-3 h-3" /> Upgrade to Collect
                            </Button>
                          )
                        ) : (
                          <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-border gap-1.5 opacity-50" disabled>
                            <CreditCard className="w-3 h-3" /> Paid</Button>
                        )}
                        {m.plan_name?.trim() && m.due_amount > 0 && (
                          <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-border gap-1.5"
                            onClick={(e) => { e.stopPropagation(); setPayLinkMember(m); }}>
                            <Link2 className="w-3 h-3" /> Send Link
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-border gap-1.5"
                          onClick={(e) => { e.stopPropagation(); setEditMember(m); }}><Edit2 className="w-3 h-3" /> Edit</Button>
                        <Button variant="outline" size="sm" className="h-8 text-[10px] rounded-xl border-destructive/30 text-destructive gap-1.5 hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); setDeleteId(m.id); }}><Trash2 className="w-3 h-3" /> Delete</Button>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}

            {members.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">{totalMembers === 0 ? "No members yet. Add your first member!" : "No members found"}</p>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} />
      <MemberDetailSheet member={viewMember} open={!!viewMember} onOpenChange={(open) => !open && setViewMember(null)} />
      <EditMemberDialog member={editMember} open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)} />
      <CollectPaymentDialog member={payMember} open={!!payMember} onOpenChange={(open) => !open && setPayMember(null)} />
      <AddSubscriptionDialog member={subMember} open={!!subMember} onOpenChange={(open) => !open && setSubMember(null)} />
      <SendPaymentLinkDialog member={payLinkMember} open={!!payLinkMember} onOpenChange={(open) => !open && setPayLinkMember(null)} />
      
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Member</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the member.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) deleteMember.mutate(deleteId); setDeleteId(null); }}
              disabled={deleteMember.isPending}>
              {deleteMember.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default MembersPage;

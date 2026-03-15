import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, FlaskConical, Globe, Users, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface FeatureFlag {
  id: string;
  name: string;
  label: string;
  description: string;
  scope: "global" | "beta" | "enterprise" | string;
  enabled: boolean;
  rollout: number;
  created_at: string;
  updated_at: string;
}

const scopeConfig: Record<string, { icon: typeof Globe; color: string }> = {
  global: { icon: Globe, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  beta: { icon: FlaskConical, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  enterprise: { icon: Users, color: "bg-primary/10 text-primary border-primary/20" },
};

const emptyForm = {
  name: "",
  label: "",
  description: "",
  scope: "global",
  enabled: true,
  rollout: 100,
};

const normalizeName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

const clampRollout = (value: number) => Math.min(100, Math.max(0, value));

const AdminFeatureFlags = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags"],
    queryFn: async (): Promise<FeatureFlag[]> => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as FeatureFlag[];
    },
  });

  const sortedFlags = useMemo(
    () =>
      [...flags].sort((a, b) => {
        if (a.scope !== b.scope) return a.scope.localeCompare(b.scope);
        return a.label.localeCompare(b.label);
      }),
    [flags],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: normalizeName(form.name),
        label: form.label.trim(),
        description: form.description.trim(),
        scope: form.scope,
        enabled: form.enabled,
        rollout: clampRollout(Number(form.rollout) || 0),
        updated_at: new Date().toISOString(),
      };

      if (!payload.name || !payload.label) {
        throw new Error("Name and label are required");
      }

      if (editingId) {
        const { error } = await supabase
          .from("feature_flags")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("feature_flags").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast.success(editingId ? "Flag updated" : "Flag created");

      void supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: editingId ? "feature_flag.updated" : "feature_flag.created",
        category: "platform",
        target_label: payloadLabel(form),
        detail: editingId ? "Updated feature flag" : "Created feature flag",
        severity: "low",
        metadata: { name: normalizeName(form.name) },
      });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save flag"),
  });

  const toggleMutation = useMutation({
    mutationFn: async (flag: FeatureFlag) => {
      const { error } = await supabase
        .from("feature_flags")
        .update({ enabled: !flag.enabled, updated_at: new Date().toISOString() })
        .eq("id", flag.id);
      if (error) throw error;
      return !flag.enabled;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
    },
    onError: () => toast.error("Failed to update flag"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (flag: FeatureFlag) => {
      const { error } = await supabase.from("feature_flags").delete().eq("id", flag.id);
      if (error) throw error;
      return flag;
    },
    onSuccess: async (flag) => {
      await queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Flag deleted");
      void supabase.from("admin_audit_logs").insert({
        actor_user_id: user?.id ?? null,
        actor_name: user?.email ?? "Admin",
        action: "feature_flag.deleted",
        category: "platform",
        target_label: flag.label,
        detail: "Deleted feature flag",
        severity: "medium",
        metadata: { name: flag.name },
      });
    },
    onError: () => toast.error("Failed to delete flag"),
  });

  const openNewFlag = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditFlag = (flag: FeatureFlag) => {
    setEditingId(flag.id);
    setForm({
      name: flag.name,
      label: flag.label,
      description: flag.description || "",
      scope: flag.scope,
      enabled: flag.enabled,
      rollout: flag.rollout,
    });
    setDialogOpen(true);
  };

  const updateForm = (patch: Partial<typeof emptyForm>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  return (
    <SuperAdminLayout title="Feature Flags" subtitle="Control feature rollouts across the platform">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {Object.entries(scopeConfig).map(([key, cfg]) => {
            const ScopeIcon = cfg.icon;
            return (
              <span key={key} className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold capitalize flex items-center gap-1.5 ${cfg.color}`}>
                <ScopeIcon className="w-3 h-3" />{key}
              </span>
            );
          })}
        </div>
        <Button className="bg-primary text-primary-foreground gap-2" onClick={openNewFlag}>
          <Plus className="w-4 h-4" /> New Flag
        </Button>
      </div>

      {isLoading && <p className="text-xs text-muted-foreground">Loading flags...</p>}
      {!isLoading && sortedFlags.length === 0 && (
        <p className="text-xs text-muted-foreground">No flags yet. Create your first flag.</p>
      )}

      <div className="space-y-3">
        {sortedFlags.map((flag, i) => {
          const scope = scopeConfig[flag.scope] ?? scopeConfig.global;
          const ScopeIcon = scope.icon;
          return (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="font-semibold text-sm">{flag.label}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1 ${scope.color}`}>
                    <ScopeIcon className="w-3 h-3" />{flag.scope}
                  </span>
                  {flag.rollout < 100 && flag.enabled && (
                    <Badge variant="outline" className="text-[10px]">{flag.rollout}% rollout</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{flag.description}</p>
                <code className="text-[10px] text-muted-foreground/60 mt-1 block">{flag.name}</code>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={flag.enabled} onCheckedChange={() => toggleMutation.mutate(flag)} />
                <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={() => openEditFlag(flag)}>
                  <Pencil className="w-3 h-3 mr-1" /> Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-3 text-xs text-destructive border-destructive/30">
                      <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this flag?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. The flag will be removed from the platform.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate(flag)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Feature Flag" : "Create Feature Flag"}</DialogTitle>
            <DialogDescription>Set the rollout, scope, and behavior for this feature.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Flag Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm({ name: e.target.value })}
                  placeholder="example_flag_name"
                  className="mt-1 bg-secondary/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Label</label>
                <Input
                  value={form.label}
                  onChange={(e) => updateForm({ label: e.target.value })}
                  placeholder="User facing label"
                  className="mt-1 bg-secondary/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Explain what this flag does"
                className="mt-1 bg-secondary/30"
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Scope</label>
                <Select value={form.scope} onValueChange={(value) => updateForm({ scope: value })}>
                  <SelectTrigger className="mt-1 bg-secondary/30">
                    <SelectValue placeholder="Scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Rollout %</label>
                <Input
                  type="number"
                  value={form.rollout}
                  onChange={(e) => updateForm({ rollout: clampRollout(Number(e.target.value) || 0) })}
                  className="mt-1 bg-secondary/30"
                />
              </div>
              <div className="flex items-end gap-2">
                <Switch checked={form.enabled} onCheckedChange={(checked) => updateForm({ enabled: checked })} />
                <span className="text-xs text-muted-foreground">Enabled</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saveMutation.isPending}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

const payloadLabel = (form: typeof emptyForm) => form.label.trim() || normalizeName(form.name) || "Feature flag";

export default AdminFeatureFlags;

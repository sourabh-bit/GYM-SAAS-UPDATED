import SuperAdminLayout from "@/components/dashboard/SuperAdminLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/ui/numeric-input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useAdminBaseData } from "@/hooks/useAdminData";
import { formatCurrencyINR } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const planPresets = [
  {
    name: "Basic",
    price: 499,
    billing_cycle: "month",
    max_members: 30,
    features: ["Member management", "Attendance tracking", "Basic reports"],
  },
  {
    name: "Growth",
    price: 999,
    billing_cycle: "month",
    max_members: 50,
    features: ["Payment collection", "Trainer management", "Advanced reports"],
  },
  {
    name: "Pro",
    price: 1499,
    billing_cycle: "month",
    max_members: 9999,
    features: ["Member app premium", "Gamification", "Retention tools"],
  },
];



const emptyForm = {
  id: "",
  name: "",
  price: "",
  billing_cycle: "month",
  max_members: "",
  features: "",
  is_active: true,
};

const AdminPlans = () => {
  const { data, isLoading } = useAdminBaseData();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const isEditing = Boolean(form.id);

  const plans = useMemo(() => data?.plans ?? [], [data]);

  const resetForm = () => setForm(emptyForm);

  const applyPreset = (preset: typeof planPresets[number]) => {
    setForm({
      id: "",
      name: preset.name,
      price: String(preset.price),
      billing_cycle: preset.billing_cycle,
      max_members: String(preset.max_members),
      features: preset.features.join("\n"),
      is_active: true,
    });
  };

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const name = form.name.trim();
      const price = Number(form.price);
      const maxMembers = Number(form.max_members);
      const billingCycle = form.billing_cycle.trim() || "month";

      if (!name) throw new Error("Plan name is required");
      if (!price || price <= 0) throw new Error("Plan price must be greater than zero");
      if (!maxMembers || maxMembers <= 0) throw new Error("Max members must be greater than zero");

      const features = form.features
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (form.id) {
        const { error } = await supabase
          .from("platform_plans")
          .update({
            name,
            price,
            billing_cycle: billingCycle,
            max_members: maxMembers,
            features,
            is_active: form.is_active,
          })
          .eq("id", form.id);
        if (error) throw error;
        return { mode: "update" as const };
      }

      const { error } = await supabase.from("platform_plans").insert({
        name,
        price,
        billing_cycle: billingCycle,
        max_members: maxMembers,
        features,
        is_active: true,
      });
      if (error) throw error;
      return { mode: "create" as const };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-base-data"] });
      await queryClient.invalidateQueries({ queryKey: ["platform_plans"] });
      toast.success(result.mode === "update" ? "Plan updated" : "Plan created");
      resetForm();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Failed to save plan"),
  });

  const togglePlanMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("platform_plans")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-base-data"] });
      await queryClient.invalidateQueries({ queryKey: ["platform_plans"] });
    },
    onError: () => toast.error("Failed to update plan"),
  });

  return (
    <SuperAdminLayout title="Create Plan" subtitle="Build and manage platform plans for gym owners">
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Create</p>
              <h2 className="font-display text-lg font-bold">{isEditing ? "Edit Plan" : "Create Plan"}</h2>
              <p className="text-[11px] text-muted-foreground mt-1">Define pricing and limits for gym owners.</p>
            </div>
            {isEditing && (
              <Button variant="outline" size="sm" className="h-8" onClick={resetForm}>
                Cancel Edit
              </Button>
            )}
          </div>

          <Separator className="my-4" />

          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Plan presets</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {planPresets.map((preset) => (
                  <button
                    key={preset.name}
                    className="rounded-xl border border-border bg-secondary/30 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    onClick={() => applyPreset(preset)}
                    type="button"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3">
              <div>
                <Label>Plan Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Starter"
                  className="mt-1 bg-secondary/30"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Price (INR)</Label>
                  <NumericInput
                    value={form.price}
                    onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="499"
                    className="mt-1 bg-secondary/30"
                    min={1}
                  />
                </div>
                <div>
                  <Label>Billing Cycle</Label>
                  <select
                    value={form.billing_cycle}
                    onChange={(e) => setForm((prev) => ({ ...prev, billing_cycle: e.target.value }))}
                    className="mt-1 w-full h-10 rounded-xl bg-secondary/30 border border-border px-3 text-sm"
                  >
                    <option value="month">Monthly</option>
                    <option value="year">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <Label>Max Members</Label>
                <NumericInput
                  value={form.max_members}
                  onChange={(e) => setForm((prev) => ({ ...prev, max_members: e.target.value }))}
                  placeholder="100"
                  className="mt-1 bg-secondary/30"
                  min={1}
                />
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <Textarea
                  value={form.features}
                  onChange={(e) => setForm((prev) => ({ ...prev, features: e.target.value }))}
                  placeholder="Feature 1\nFeature 2"
                  className="mt-1 min-h-[120px] bg-secondary/30"
                />
              </div>
              {isEditing && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-border bg-secondary/30"
                  />
                  Plan is active
                </label>
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-4">
            <Button variant="outline" onClick={resetForm} disabled={savePlanMutation.isPending}>
              Reset
            </Button>
            <Button onClick={() => savePlanMutation.mutate()} disabled={savePlanMutation.isPending}>
              {savePlanMutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Plan"}
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-4 sm:p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Library</p>
              <h3 className="font-display text-lg font-bold">Existing Plans</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">{plans.length} total</span>
          </div>

          <Separator className="my-4" />

          {isLoading && <p className="text-xs text-muted-foreground">Loading plans...</p>}
          {!isLoading && plans.length === 0 && (
            <p className="text-xs text-muted-foreground">No plans created yet.</p>
          )}

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {plans.map((plan) => {
              const features = Array.isArray(plan.features) ? plan.features : [];
              const preview = features.slice(0, 2).join(" · ");
              const extraCount = Math.max(features.length - 2, 0);
              const isSelected = form.id === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl border px-4 py-3 transition-colors ${
                    isSelected ? "border-primary/40 bg-primary/5" : "border-border/60 bg-secondary/10"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{plan.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {formatCurrencyINR(plan.price)}/{plan.billing_cycle} · Up to {plan.max_members} members
                      </p>
                      {preview && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {preview}{extraCount > 0 ? ` +${extraCount} more` : ""}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${plan.is_active ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-border text-muted-foreground"}`}>
                        {plan.is_active ? "Active" : "Inactive"}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2 text-[11px]"
                          onClick={() => {
                            const featuresText = Array.isArray(plan.features) ? plan.features.join("\n") : "";
                            setForm({
                              id: plan.id,
                              name: plan.name,
                              price: String(plan.price),
                              billing_cycle: plan.billing_cycle,
                              max_members: String(plan.max_members),
                              features: featuresText,
                              is_active: plan.is_active,
                            });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-[11px]"
                          onClick={() => togglePlanMutation.mutate({ id: plan.id, is_active: !plan.is_active })}
                          disabled={togglePlanMutation.isPending}
                        >
                          {plan.is_active ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </SuperAdminLayout>
  );
};

export default AdminPlans;

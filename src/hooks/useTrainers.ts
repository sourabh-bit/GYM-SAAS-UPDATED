import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isDemoGymMode } from "@/lib/demoMode";
import {
  addDemoTrainer,
  deleteDemoTrainer,
  getDemoTrainers,
  updateDemoTrainer,
} from "@/lib/demoGymData";

export interface Trainer {
  id: string;
  gym_id: string;
  name: string;
  specialty: string;
  phone: string;
  email: string;
  members_count: number;
  rating: number;
  status: "active" | "on_leave" | "inactive";
  schedule: string;
  created_at: string;
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

export const useTrainers = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useQuery({
    queryKey: ["trainers", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) return getDemoTrainers() as Trainer[];
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("trainers")
        .select("*")
        .eq("gym_id", gymId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Trainer[];
    },
    enabled: isDemoMode || !!gymId,
  });
};

export const useAddTrainer = () => {
  const queryClient = useQueryClient();
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async (trainer: Omit<Trainer, "id" | "gym_id" | "created_at">) => {
      if (isDemoMode) return addDemoTrainer(trainer as any);
      if (!gymId) throw new Error("No gym");
      const { data, error } = await supabase
        .from("trainers")
        .insert({ ...trainer, gym_id: gymId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Trainer added successfully");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

export const useUpdateTrainer = () => {
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Trainer> & { id: string }) => {
      if (isDemoMode) {
        const updated = updateDemoTrainer(id, updates as any);
        if (!updated) throw new Error("Trainer not found");
        return updated;
      }
      const { data, error } = await supabase
        .from("trainers")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Trainer updated");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

export const useDeleteTrainer = () => {
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async (id: string) => {
      if (isDemoMode) {
        deleteDemoTrainer(id);
        return;
      }
      const { error } = await supabase.from("trainers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainers"] });
      toast.success("Trainer deleted");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

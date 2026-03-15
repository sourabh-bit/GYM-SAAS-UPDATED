import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { isDemoGymMode } from "@/lib/demoMode";
import { createNotificationIfMissing } from "./notification-utils";
import {
  addDemoAttendance,
  checkoutDemoAttendance,
  getDemoAttendance,
} from "@/lib/demoGymData";

export interface AttendanceRecord {
  id: string;
  gym_id: string;
  member_id: string | null;
  member_name: string | null;
  check_in: string;
  check_out: string | null;
  created_at: string;
  members?: { name: string } | null;
}

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong";

export const useAttendance = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useQuery({
    queryKey: ["attendance", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) return getDemoAttendance() as AttendanceRecord[];
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*, members(name)")
        .eq("gym_id", gymId)
        .order("check_in", { ascending: false });
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: isDemoMode || !!gymId,
  });
};

/** Helper to get display name from an attendance record */
export const getAttendanceMemberName = (record: AttendanceRecord): string => {
  return record.members?.name || record.member_name || "Deleted Member";
};

export const useActiveSessions = () => {
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useQuery({
    queryKey: ["active-sessions", isDemoMode ? "demo-gym" : gymId],
    queryFn: async () => {
      if (isDemoMode) {
        return (getDemoAttendance() as AttendanceRecord[]).filter(
          (record) => !record.check_out,
        );
      }
      if (!gymId) return [];
      const { data, error } = await supabase
        .from("attendance")
        .select("*, members(name)")
        .eq("gym_id", gymId)
        .is("check_out", null)
        .order("check_in", { ascending: false });
      if (error) throw error;
      return data as AttendanceRecord[];
    },
    enabled: isDemoMode || !!gymId,
  });
};

export const useCheckIn = () => {
  const queryClient = useQueryClient();
  const { gymId } = useAuth();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async ({ memberId, memberName }: { memberId: string; memberName: string }) => {
      if (isDemoMode) {
        return addDemoAttendance({ memberId, memberName });
      }
      if (!gymId) throw new Error("No gym");
      const { data, error } = await supabase.rpc("owner_check_in_member", {
        p_member_id: memberId,
        p_member_name: memberName,
      });
      if (error) throw error;

      await createNotificationIfMissing({
        gym_id: gymId,
        title: "Member Checked In",
        message: `${memberName} checked in.`,
        type: "info",
        metadata: {
          key: "check_in",
          event_id: String(data),
          member_id: memberId,
          date: new Date().toISOString().slice(0, 10),
        },
      });

      return { id: String(data) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      toast.success("Checked in!");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

export const useCheckOut = () => {
  const queryClient = useQueryClient();
  const isDemoMode = isDemoGymMode();

  return useMutation({
    mutationFn: async (attendanceId: string) => {
      if (isDemoMode) {
        const updated = checkoutDemoAttendance(attendanceId);
        if (!updated) throw new Error("Attendance record not found");
        return updated;
      }
      const { data, error } = await supabase.rpc("owner_check_out_session", {
        p_attendance_id: attendanceId,
      });
      if (error) throw error;
      return { id: String(data) };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      queryClient.invalidateQueries({ queryKey: ["active-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      queryClient.invalidateQueries({ queryKey: ["members-page"] });
      toast.success("Checked out!");
    },
    onError: (error) => toast.error(toErrorMessage(error)),
  });
};

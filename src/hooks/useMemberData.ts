import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const isDemoMemberMode = () =>
  typeof window !== "undefined" &&
  window.location.pathname === "/demo" &&
  new URLSearchParams(window.location.search).get("mode") === "member";

export const useMemberData = () => {
  const { user } = useAuth();
  const isDemoMode = isDemoMemberMode();

  const memberQuery = useQuery({
    queryKey: ["member-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: member, error } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return member;
    },
    enabled: !!user?.id && !isDemoMode,
    staleTime: 5 * 60 * 1000,
  });

  const profileQuery = useQuery({
    queryKey: ["member-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id && !isDemoMode,
    staleTime: 5 * 60 * 1000,
  });

  const memberId = memberQuery.data?.id;
  const gymId = memberQuery.data?.gym_id;
  const trainerId = memberQuery.data?.trainer_id;

  const gymQuery = useQuery({
    queryKey: ["member-gym", gymId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gyms")
        .select("id, name, address, phone, current_plan_id, plan_expires_at, created_at")
        .eq("id", gymId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!gymId && !isDemoMode,
    staleTime: 10 * 60 * 1000,
  });

  const attendanceQuery = useQuery({
    queryKey: ["member-attendance", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance")
        .select("*")
        .eq("member_id", memberId!)
        .order("check_in", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!memberId && !isDemoMode,
    staleTime: 2 * 60 * 1000,
  });

  const subscriptionQuery = useQuery({
    queryKey: ["member-subscription", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("member_id", memberId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!memberId && !isDemoMode,
    staleTime: 5 * 60 * 1000,
  });

  const trainerQuery = useQuery({
    queryKey: ["member-trainer", trainerId],
    queryFn: async () => {
      if (!trainerId) return null;
      const { data, error } = await supabase
        .from("trainers")
        .select("name, specialty, phone, email")
        .eq("id", trainerId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!trainerId && !isDemoMode,
    staleTime: 10 * 60 * 1000,
  });

  if (isDemoMode && !user?.id) {
    const now = new Date();
    const withDaysAgo = (days: number, hour: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      d.setHours(hour, 20, 0, 0);
      return d.toISOString();
    };

    const demoMember = {
      id: "demo-member-1",
      user_id: "demo-user-1",
      gym_id: "demo-gym-1",
      trainer_id: "demo-trainer-1",
      name: "Rohan Mehta",
      email: "rohan.mehta@email.com",
      phone: "+91 98765 12034",
      plan_name: "Pro Annual",
      status: "active",
      payment_status: "paid",
      due_amount: 0,
      joined_at: "2025-01-10T09:00:00.000Z",
      expiry_at: "2027-01-09T23:59:59.000Z",
    } as any;

    const demoProfile = {
      id: "demo-user-1",
      full_name: "Rohan Mehta",
      email: "rohan.mehta@email.com",
      phone: "+91 98765 12034",
      gym_id: "demo-gym-1",
    } as any;

    const demoGym = {
      id: "demo-gym-1",
      name: "Iron Fitness Studio",
      address: "Indiranagar, Bangalore",
      phone: "+91 90000 11111",
      current_plan_id: "platform-pro",
      plan_expires_at: "2027-01-09T23:59:59.000Z",
      created_at: "2025-01-01T09:00:00.000Z",
    } as any;

    const demoAttendance = [
      { id: "a1", member_id: "demo-member-1", check_in: withDaysAgo(0, 6), check_out: withDaysAgo(0, 7) },
      { id: "a2", member_id: "demo-member-1", check_in: withDaysAgo(1, 7), check_out: withDaysAgo(1, 8) },
      { id: "a3", member_id: "demo-member-1", check_in: withDaysAgo(2, 6), check_out: withDaysAgo(2, 7) },
      { id: "a4", member_id: "demo-member-1", check_in: withDaysAgo(3, 18), check_out: withDaysAgo(3, 19) },
      { id: "a5", member_id: "demo-member-1", check_in: withDaysAgo(4, 18), check_out: withDaysAgo(4, 19) },
      { id: "a6", member_id: "demo-member-1", check_in: withDaysAgo(6, 7), check_out: withDaysAgo(6, 8) },
      { id: "a7", member_id: "demo-member-1", check_in: withDaysAgo(8, 6), check_out: withDaysAgo(8, 7) },
      { id: "a8", member_id: "demo-member-1", check_in: withDaysAgo(10, 18), check_out: withDaysAgo(10, 19) },
      { id: "a9", member_id: "demo-member-1", check_in: withDaysAgo(12, 7), check_out: withDaysAgo(12, 8) },
      { id: "a10", member_id: "demo-member-1", check_in: withDaysAgo(14, 18), check_out: withDaysAgo(14, 19) },
      { id: "a11", member_id: "demo-member-1", check_in: withDaysAgo(16, 6), check_out: withDaysAgo(16, 7) },
      { id: "a12", member_id: "demo-member-1", check_in: withDaysAgo(19, 7), check_out: withDaysAgo(19, 8) },
    ] as any[];

    const demoSubscription = {
      id: "demo-subscription-1",
      member_id: "demo-member-1",
      start_date: "2025-01-10",
      end_date: "2027-01-09",
      status: "active",
    } as any;

    const demoTrainer = {
      name: "Aisha Khan",
      specialty: "Strength & Conditioning",
      phone: "+91 98765 44321",
      email: "aisha@fitcore.demo",
    } as any;

    const initials = "RM";

    return {
      member: demoMember,
      profile: demoProfile,
      gym: demoGym,
      attendance: demoAttendance,
      subscription: demoSubscription,
      trainer: demoTrainer,
      initials,
      isLoading: false,
      refetchProfile: async () => ({ data: demoProfile } as any),
    };
  }

  const member = memberQuery.data;
  const profile = profileQuery.data;
  const gym = gymQuery.data;
  const attendance = attendanceQuery.data || [];
  const subscription = subscriptionQuery.data;
  const trainer = trainerQuery.data;

  const initials = (profile?.full_name || member?.name || "")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isLoading = memberQuery.isLoading || profileQuery.isLoading;

  return {
    member,
    profile,
    gym,
    attendance,
    subscription,
    trainer,
    initials,
    isLoading,
    refetchProfile: profileQuery.refetch,
  };
};

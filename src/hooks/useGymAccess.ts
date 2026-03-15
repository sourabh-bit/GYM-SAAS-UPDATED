import { useMemo } from "react";
import { usePlatformPlans, useCurrentGymPlan } from "@/hooks/usePlatformPlans";
import { buildFeatureAccess } from "@/lib/featureAccess";
import { isDemoGymMode, isDemoMemberMode } from "@/lib/demoMode";

export const useGymAccess = () => {
  const isDemoMode = isDemoGymMode() || isDemoMemberMode();
  const { data: planSnapshot, isLoading: planLoading } = useCurrentGymPlan();
  const { data: plans = [], isLoading: plansLoading } = usePlatformPlans();

  const resolvedPlanName = useMemo(() => {
    if (!planSnapshot?.current_plan_id) return null;
    return (
      plans.find((p) => p.id === planSnapshot.current_plan_id)?.name ??
      planSnapshot.current_plan_id
    );
  }, [plans, planSnapshot?.current_plan_id]);

  const access = useMemo(
    () =>
      buildFeatureAccess({
        planName: resolvedPlanName,
        planExpiresAt: planSnapshot?.plan_expires_at ?? null,
        gymCreatedAt: planSnapshot?.created_at ?? null,
        isDemoMode,
      }),
    [isDemoMode, resolvedPlanName, planSnapshot?.created_at, planSnapshot?.plan_expires_at],
  );

  return {
    access,
    isLoading:
      !isDemoMode &&
      (planLoading || (!!planSnapshot?.current_plan_id && plansLoading)),
  };
};

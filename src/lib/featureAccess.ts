export type PlanTier = "trial" | "basic" | "growth" | "pro" | "locked" | "unknown";

export type FeatureKey =
  | "members_manage"
  | "attendance"
  | "dashboard_basic"
  | "plans_manage"
  | "due_tracking"
  | "notifications_basic"
  | "reports_basic"
  | "payments_collect"
  | "pdf_exports"
  | "reports_advanced"
  | "trainers_manage"
  | "subscription_analytics"
  | "attendance_advanced"
  | "member_app_premium";

export type FeatureSet = Record<FeatureKey, boolean>;

const BASIC_FEATURES: FeatureKey[] = [
  "members_manage",
  "attendance",
  "dashboard_basic",
  "plans_manage",
  "due_tracking",
  "notifications_basic",
  "reports_basic",
];

const GROWTH_FEATURES: FeatureKey[] = [
  ...BASIC_FEATURES,
  "payments_collect",
  "pdf_exports",
  "reports_advanced",
  "trainers_manage",
  "subscription_analytics",
  "attendance_advanced",
];

const PRO_FEATURES: FeatureKey[] = [
  ...GROWTH_FEATURES,
  "member_app_premium",
];

const ALL_FEATURES: FeatureKey[] = [...PRO_FEATURES];

const buildFeatureSet = (features: FeatureKey[]) =>
  ALL_FEATURES.reduce<FeatureSet>((acc, key) => {
    acc[key] = features.includes(key);
    return acc;
  }, {} as FeatureSet);

const tokensFromName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export const resolvePlanTier = (planName?: string | null): PlanTier => {
  if (!planName) return "unknown";
  const tokens = tokensFromName(planName);

  if (tokens.some((t) => ["pro", "premium", "enterprise", "elite"].includes(t))) return "pro";
  if (tokens.some((t) => ["growth", "business", "professional", "plus", "standard"].includes(t))) return "growth";
  if (tokens.some((t) => ["basic", "starter", "lite"].includes(t))) return "basic";

  return "unknown";
};

export interface FeatureAccessInput {
  planName?: string | null;
  planExpiresAt?: string | null;
  gymCreatedAt?: string | null;
  isDemoMode?: boolean;
  trialDays?: number;
}

export interface FeatureAccess {
  tier: PlanTier;
  planName?: string | null;
  isTrial: boolean;
  isLocked: boolean;
  planExpiresAt?: string | null;
  trialEndsAt?: string | null;
  features: FeatureSet;
}

export const buildFeatureAccess = ({
  planName,
  planExpiresAt,
  gymCreatedAt,
  isDemoMode = false,
  trialDays = 14,
}: FeatureAccessInput): FeatureAccess => {
  if (isDemoMode) {
    return {
      tier: "pro",
      planName,
      isTrial: false,
      isLocked: false,
      planExpiresAt,
      trialEndsAt: null,
      features: buildFeatureSet(ALL_FEATURES),
    };
  }

  const now = new Date();
  const expiryDate = planExpiresAt ? new Date(planExpiresAt) : null;
  const isPlanActive = !!planName && (!expiryDate || expiryDate > now);

  const trialEndsAt = gymCreatedAt
    ? new Date(new Date(gymCreatedAt).getTime() + trialDays * 86400000)
    : null;
  const isTrial = !planName && !!trialEndsAt && now < trialEndsAt;

  if (isTrial) {
    return {
      tier: "trial",
      planName,
      isTrial: true,
      isLocked: false,
      planExpiresAt,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      features: buildFeatureSet(ALL_FEATURES),
    };
  }

  if (!isPlanActive) {
    return {
      tier: "locked",
      planName,
      isTrial: false,
      isLocked: true,
      planExpiresAt,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      features: buildFeatureSet([]),
    };
  }

  const tier = resolvePlanTier(planName);

  if (tier === "basic") {
    return {
      tier,
      planName,
      isTrial: false,
      isLocked: false,
      planExpiresAt,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      features: buildFeatureSet(BASIC_FEATURES),
    };
  }

  if (tier === "growth") {
    return {
      tier,
      planName,
      isTrial: false,
      isLocked: false,
      planExpiresAt,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      features: buildFeatureSet(GROWTH_FEATURES),
    };
  }

  if (tier === "pro") {
    return {
      tier,
      planName,
      isTrial: false,
      isLocked: false,
      planExpiresAt,
      trialEndsAt: trialEndsAt?.toISOString() ?? null,
      features: buildFeatureSet(PRO_FEATURES),
    };
  }

  return {
    tier: "unknown",
    planName,
    isTrial: false,
    isLocked: false,
    planExpiresAt,
    trialEndsAt: trialEndsAt?.toISOString() ?? null,
    features: buildFeatureSet(BASIC_FEATURES),
  };
};

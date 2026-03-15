const nowIso = () => new Date().toISOString();

const daysAgoIso = (days: number, hour = 9, minute = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const daysAheadIso = (days: number, hour = 23, minute = 59) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

let idCounter = 1000;
const nextId = (prefix: string) => `demo-${prefix}-${idCounter++}`;

export const DEMO_GYM_ID = "demo-gym-1";

const DEFAULT_OWNER_PREFERENCES = {
  notifications: {
    payment_reminders: true,
    new_member_alerts: true,
    subscription_expiry: true,
  },
};

let demoGymProfile = {
  id: DEMO_GYM_ID,
  name: "Iron Fitness Studio",
  phone: "+1 555 010 201",
  address: "241 Market Street, San Jose, CA",
  created_at: daysAgoIso(90),
  current_plan_id: "platform-pro",
  plan_expires_at: daysAheadIso(48),
  owner_preferences: DEFAULT_OWNER_PREFERENCES,
};

let demoPlans = [
  {
    id: "plan-basic",
    gym_id: DEMO_GYM_ID,
    name: "Basic Monthly",
    price: 1999,
    duration_days: 30,
    description: "General gym access",
    is_active: true,
    created_at: daysAgoIso(180),
  },
  {
    id: "plan-pro",
    gym_id: DEMO_GYM_ID,
    name: "Pro Quarterly",
    price: 4999,
    duration_days: 90,
    description: "Gym + group classes",
    is_active: true,
    created_at: daysAgoIso(220),
  },
  {
    id: "plan-elite",
    gym_id: DEMO_GYM_ID,
    name: "Elite Annual",
    price: 17999,
    duration_days: 365,
    description: "All access + trainer support",
    is_active: true,
    created_at: daysAgoIso(260),
  },
];

let demoTrainers = [
  {
    id: "trainer-1",
    gym_id: DEMO_GYM_ID,
    name: "Aisha Khan",
    specialty: "Strength",
    phone: "+1 555 010 901",
    email: "aisha@fitcore.demo",
    members_count: 0,
    rating: 4.8,
    status: "active",
    schedule: "6am-2pm",
    created_at: daysAgoIso(210),
  },
  {
    id: "trainer-2",
    gym_id: DEMO_GYM_ID,
    name: "Ethan Reed",
    specialty: "Fat Loss",
    phone: "+1 555 010 902",
    email: "ethan@fitcore.demo",
    members_count: 0,
    rating: 4.6,
    status: "active",
    schedule: "2pm-10pm",
    created_at: daysAgoIso(170),
  },
  {
    id: "trainer-3",
    gym_id: DEMO_GYM_ID,
    name: "Sofia Park",
    specialty: "Mobility",
    phone: "+1 555 010 903",
    email: "sofia@fitcore.demo",
    members_count: 0,
    rating: 4.7,
    status: "on_leave",
    schedule: "On leave",
    created_at: daysAgoIso(140),
  },
];

let demoMembers = [
  {
    id: "member-1",
    gym_id: DEMO_GYM_ID,
    name: "Rohan Mehta",
    email: "rohan.mehta@email.com",
    phone: "+1 555 010 101",
    plan_id: "plan-pro",
    plan_name: "Pro Quarterly",
    trainer_id: "trainer-1",
    status: "active",
    joined_at: daysAgoIso(120),
    expiry_at: daysAheadIso(38),
    due_amount: 0,
    last_payment: 4999,
    payment_status: "paid",
    payment_method: "card",
    payment_date: daysAgoIso(6, 11, 10),
    last_checkin: daysAgoIso(0, 6, 20),
    created_at: daysAgoIso(120),
  },
  {
    id: "member-2",
    gym_id: DEMO_GYM_ID,
    name: "Ananya Gupta",
    email: "ananya.gupta@email.com",
    phone: "+1 555 010 102",
    plan_id: "plan-basic",
    plan_name: "Basic Monthly",
    trainer_id: "trainer-2",
    status: "active",
    joined_at: daysAgoIso(75),
    expiry_at: daysAheadIso(8),
    due_amount: 1999,
    last_payment: 0,
    payment_status: "pending",
    payment_method: "cash",
    payment_date: null,
    last_checkin: daysAgoIso(1, 18, 5),
    created_at: daysAgoIso(75),
  },
  {
    id: "member-3",
    gym_id: DEMO_GYM_ID,
    name: "Arjun Patel",
    email: "arjun.patel@email.com",
    phone: "+1 555 010 103",
    plan_id: "plan-basic",
    plan_name: "Basic Monthly",
    trainer_id: "trainer-2",
    status: "expired",
    joined_at: daysAgoIso(160),
    expiry_at: daysAgoIso(9),
    due_amount: 2499,
    last_payment: 0,
    payment_status: "overdue",
    payment_method: "cash",
    payment_date: null,
    last_checkin: daysAgoIso(11, 20, 10),
    created_at: daysAgoIso(160),
  },
  {
    id: "member-4",
    gym_id: DEMO_GYM_ID,
    name: "Maya Chen",
    email: "maya.chen@email.com",
    phone: "+1 555 010 104",
    plan_id: "plan-elite",
    plan_name: "Elite Annual",
    trainer_id: "trainer-1",
    status: "active",
    joined_at: daysAgoIso(250),
    expiry_at: daysAheadIso(184),
    due_amount: 0,
    last_payment: 17999,
    payment_status: "paid",
    payment_method: "upi:TXN43328",
    payment_date: daysAgoIso(30, 12, 0),
    last_checkin: daysAgoIso(0, 18, 40),
    created_at: daysAgoIso(250),
  },
  {
    id: "member-5",
    gym_id: DEMO_GYM_ID,
    name: "Liam Walker",
    email: "liam.walker@email.com",
    phone: "+1 555 010 105",
    plan_id: null,
    plan_name: "",
    trainer_id: null,
    status: "trial",
    joined_at: daysAgoIso(3),
    expiry_at: daysAheadIso(4),
    due_amount: 0,
    last_payment: 0,
    payment_status: "pending",
    payment_method: "cash",
    payment_date: null,
    last_checkin: daysAgoIso(1, 8, 15),
    created_at: daysAgoIso(3),
  },
  {
    id: "member-6",
    gym_id: DEMO_GYM_ID,
    name: "Sara Kim",
    email: "sara.kim@email.com",
    phone: "+1 555 010 106",
    plan_id: "plan-pro",
    plan_name: "Pro Quarterly",
    trainer_id: "trainer-1",
    status: "frozen",
    joined_at: daysAgoIso(98),
    expiry_at: daysAheadIso(19),
    due_amount: 600,
    last_payment: 4399,
    payment_status: "partial",
    payment_method: "cash",
    payment_date: daysAgoIso(2, 19, 5),
    last_checkin: daysAgoIso(4, 19, 0),
    created_at: daysAgoIso(98),
  },
];

let demoSubscriptions = [
  {
    id: "subscription-1",
    gym_id: DEMO_GYM_ID,
    member_id: "member-1",
    member_name: "Rohan Mehta",
    plan_id: "plan-pro",
    plan_name: "Pro Quarterly",
    start_date: daysAgoIso(6, 11, 10),
    end_date: daysAheadIso(84),
    amount: 4999,
    amount_paid: 4999,
    payment_method: "card",
    payment_status: "paid",
    created_at: daysAgoIso(6, 11, 10),
  },
  {
    id: "subscription-2",
    gym_id: DEMO_GYM_ID,
    member_id: "member-2",
    member_name: "Ananya Gupta",
    plan_id: "plan-basic",
    plan_name: "Basic Monthly",
    start_date: daysAgoIso(22, 10, 0),
    end_date: daysAheadIso(8),
    amount: 1999,
    amount_paid: 0,
    payment_method: "cash",
    payment_status: "pending",
    created_at: daysAgoIso(22, 10, 0),
  },
  {
    id: "subscription-3",
    gym_id: DEMO_GYM_ID,
    member_id: "member-4",
    member_name: "Maya Chen",
    plan_id: "plan-elite",
    plan_name: "Elite Annual",
    start_date: daysAgoIso(30, 12, 0),
    end_date: daysAheadIso(335),
    amount: 17999,
    amount_paid: 17999,
    payment_method: "upi:TXN43328",
    payment_status: "paid",
    created_at: daysAgoIso(30, 12, 0),
  },
  {
    id: "subscription-4",
    gym_id: DEMO_GYM_ID,
    member_id: "member-6",
    member_name: "Sara Kim",
    plan_id: "plan-pro",
    plan_name: "Pro Quarterly",
    start_date: daysAgoIso(2, 19, 5),
    end_date: daysAheadIso(88),
    amount: 4999,
    amount_paid: 4399,
    payment_method: "cash",
    payment_status: "partial",
    created_at: daysAgoIso(2, 19, 5),
  },
];

let demoAttendance = [
  {
    id: "attendance-1",
    gym_id: DEMO_GYM_ID,
    member_id: "member-1",
    member_name: "Rohan Mehta",
    check_in: daysAgoIso(0, 6, 20),
    check_out: null,
    created_at: daysAgoIso(0, 6, 20),
  },
  {
    id: "attendance-2",
    gym_id: DEMO_GYM_ID,
    member_id: "member-4",
    member_name: "Maya Chen",
    check_in: daysAgoIso(0, 18, 40),
    check_out: null,
    created_at: daysAgoIso(0, 18, 40),
  },
  {
    id: "attendance-3",
    gym_id: DEMO_GYM_ID,
    member_id: "member-2",
    member_name: "Ananya Gupta",
    check_in: daysAgoIso(1, 18, 5),
    check_out: daysAgoIso(1, 19, 15),
    created_at: daysAgoIso(1, 18, 5),
  },
  {
    id: "attendance-4",
    gym_id: DEMO_GYM_ID,
    member_id: "member-6",
    member_name: "Sara Kim",
    check_in: daysAgoIso(2, 19, 5),
    check_out: daysAgoIso(2, 20, 10),
    created_at: daysAgoIso(2, 19, 5),
  },
  {
    id: "attendance-5",
    gym_id: DEMO_GYM_ID,
    member_id: "member-5",
    member_name: "Liam Walker",
    check_in: daysAgoIso(1, 8, 15),
    check_out: daysAgoIso(1, 9, 2),
    created_at: daysAgoIso(1, 8, 15),
  },
  {
    id: "attendance-6",
    gym_id: DEMO_GYM_ID,
    member_id: "member-3",
    member_name: "Arjun Patel",
    check_in: daysAgoIso(11, 20, 10),
    check_out: daysAgoIso(11, 21, 2),
    created_at: daysAgoIso(11, 20, 10),
  },
];

let demoNotifications = [
  {
    id: "notification-1",
    gym_id: DEMO_GYM_ID,
    title: "Payment Overdue",
    message: "Arjun Patel has overdue payment pending.",
    type: "alert",
    is_read: false,
    metadata: { key: "overdue", member_id: "member-3", date: daysAgoIso(0).slice(0, 10) },
    created_at: daysAgoIso(0, 8, 30),
  },
  {
    id: "notification-2",
    gym_id: DEMO_GYM_ID,
    title: "Subscription Expiring",
    message: "Ananya Gupta subscription expires soon.",
    type: "warning",
    is_read: false,
    metadata: { key: "expiry_soon", member_id: "member-2", date: daysAgoIso(0).slice(0, 10) },
    created_at: daysAgoIso(0, 9, 0),
  },
  {
    id: "notification-3",
    gym_id: DEMO_GYM_ID,
    title: "New Member Joined",
    message: "Liam Walker joined your gym.",
    type: "success",
    is_read: true,
    metadata: { key: "new_member", member_id: "member-5", date: daysAgoIso(0).slice(0, 10) },
    created_at: daysAgoIso(0, 10, 0),
  },
];

const demoPlatformPlans = [
  {
    id: "platform-starter",
    name: "Basic",
    price: 499,
    billing_cycle: "month",
    max_members: 30,
    features: ["Member management", "Attendance tracking", "Basic reports"],
    is_active: true,
    created_at: daysAgoIso(600),
  },
  {
    id: "platform-pro",
    name: "Growth",
    price: 999,
    billing_cycle: "month",
    max_members: 50,
    features: ["Payment collection", "Trainer management", "Advanced reports"],
    is_active: true,
    created_at: daysAgoIso(500),
  },
  {
    id: "platform-enterprise",
    name: "Pro",
    price: 1499,
    billing_cycle: "month",
    max_members: 9999,
    features: ["Member app premium", "Gamification", "Retention tools"],
    is_active: true,
    created_at: daysAgoIso(400),
  },
];

let demoPlanRequests = [
  {
    id: "plan-request-1",
    gym_id: DEMO_GYM_ID,
    requested_plan_id: "platform-pro",
    request_type: "renew",
    status: "approved",
    gym_name: demoGymProfile.name,
    owner_name: "Demo Owner",
    message: "Renewal request approved",
    created_at: daysAgoIso(40),
    resolved_at: daysAgoIso(38),
  },
];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const syncTrainerMemberCounts = () => {
  const countMap: Record<string, number> = {};
  demoMembers.forEach((member) => {
    if (!member.trainer_id) return;
    countMap[member.trainer_id] = (countMap[member.trainer_id] || 0) + 1;
  });
  demoTrainers = demoTrainers.map((trainer) => ({
    ...trainer,
    members_count: countMap[trainer.id] || 0,
  }));
};

syncTrainerMemberCounts();

export const getDemoGymProfile = () => clone(demoGymProfile);
export const updateDemoGymProfile = (updates: Partial<typeof demoGymProfile>) => {
  const nextOwnerPreferences = updates.owner_preferences
    ? {
        ...demoGymProfile.owner_preferences,
        ...updates.owner_preferences,
        notifications: {
          ...demoGymProfile.owner_preferences.notifications,
          ...updates.owner_preferences.notifications,
        },
      }
    : demoGymProfile.owner_preferences;

  demoGymProfile = {
    ...demoGymProfile,
    ...updates,
    owner_preferences: nextOwnerPreferences,
  };
  return clone(demoGymProfile);
};

export const getDemoMembers = () => clone(demoMembers);
export const addDemoMember = (member: Record<string, any>) => {
  const created = {
    ...member,
    id: nextId("member"),
    gym_id: DEMO_GYM_ID,
    created_at: nowIso(),
  };
  demoMembers = [created, ...demoMembers];
  syncTrainerMemberCounts();
  return clone(created);
};

export const updateDemoMember = (id: string, updates: Record<string, any>) => {
  const current = demoMembers.find((member) => member.id === id);
  if (!current) return null;

  const updated = { ...current, ...updates };
  demoMembers = demoMembers.map((member) => (member.id === id ? updated : member));

  if (current.name !== updated.name) {
    demoAttendance = demoAttendance.map((record) =>
      record.member_id === id ? { ...record, member_name: updated.name } : record,
    );
    demoSubscriptions = demoSubscriptions.map((subscription) =>
      subscription.member_id === id
        ? { ...subscription, member_name: updated.name }
        : subscription,
    );
  }

  syncTrainerMemberCounts();
  return clone(updated);
};

export const deleteDemoMember = (id: string) => {
  const member = demoMembers.find((item) => item.id === id);
  if (!member) return;

  demoAttendance = demoAttendance.map((record) =>
    record.member_id === id
      ? { ...record, member_id: null, member_name: member.name }
      : record,
  );
  demoSubscriptions = demoSubscriptions.map((subscription) =>
    subscription.member_id === id
      ? { ...subscription, member_id: null, member_name: member.name }
      : subscription,
  );
  demoMembers = demoMembers.filter((item) => item.id !== id);
  syncTrainerMemberCounts();
};

export const getDemoTrainers = () => clone(demoTrainers);
export const addDemoTrainer = (trainer: Record<string, any>) => {
  const created = {
    ...trainer,
    id: nextId("trainer"),
    gym_id: DEMO_GYM_ID,
    created_at: nowIso(),
    members_count: trainer.members_count || 0,
  };
  demoTrainers = [created, ...demoTrainers];
  return clone(created);
};

export const updateDemoTrainer = (id: string, updates: Record<string, any>) => {
  const current = demoTrainers.find((trainer) => trainer.id === id);
  if (!current) return null;
  const updated = { ...current, ...updates };
  demoTrainers = demoTrainers.map((trainer) => (trainer.id === id ? updated : trainer));
  return clone(updated);
};

export const deleteDemoTrainer = (id: string) => {
  demoTrainers = demoTrainers.filter((trainer) => trainer.id !== id);
  demoMembers = demoMembers.map((member) =>
    member.trainer_id === id ? { ...member, trainer_id: null } : member,
  );
  syncTrainerMemberCounts();
};

export const getDemoPlans = () => clone(demoPlans);
export const addDemoPlan = (plan: Record<string, any>) => {
  const created = {
    ...plan,
    id: nextId("plan"),
    gym_id: DEMO_GYM_ID,
    created_at: nowIso(),
  };
  demoPlans = [created, ...demoPlans];
  return clone(created);
};

export const updateDemoPlan = (id: string, updates: Record<string, any>) => {
  const current = demoPlans.find((plan) => plan.id === id);
  if (!current) return null;
  const updated = { ...current, ...updates };
  demoPlans = demoPlans.map((plan) => (plan.id === id ? updated : plan));

  if (typeof updates.name === "string" && updates.name.trim().length > 0) {
    const nextPlanName = updates.name.trim();
    const previousPlanName = current.name;

    demoMembers = demoMembers.map((member) =>
      member.plan_id === id || member.plan_name === previousPlanName
        ? { ...member, plan_name: nextPlanName }
        : member,
    );

    demoSubscriptions = demoSubscriptions.map((subscription) =>
      subscription.plan_id === id || subscription.plan_name === previousPlanName
        ? { ...subscription, plan_name: nextPlanName }
        : subscription,
    );
  }

  return clone(updated);
};

export const deleteDemoPlan = (id: string) => {
  demoPlans = demoPlans.filter((plan) => plan.id !== id);
};

export const getDemoSubscriptions = () => clone(demoSubscriptions);
export const addDemoSubscription = (subscription: Record<string, any>) => {
  const created = {
    ...subscription,
    id: nextId("subscription"),
    gym_id: DEMO_GYM_ID,
    created_at: subscription.created_at || nowIso(),
  };
  demoSubscriptions = [created, ...demoSubscriptions];
  return clone(created);
};

export const getDemoAttendance = () => clone(demoAttendance);
export const addDemoAttendance = ({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) => {
  const created = {
    id: nextId("attendance"),
    gym_id: DEMO_GYM_ID,
    member_id: memberId,
    member_name: memberName,
    check_in: nowIso(),
    check_out: null,
    created_at: nowIso(),
  };
  demoAttendance = [created, ...demoAttendance];
  demoMembers = demoMembers.map((member) =>
    member.id === memberId ? { ...member, last_checkin: created.check_in } : member,
  );
  return clone(created);
};

export const checkoutDemoAttendance = (attendanceId: string) => {
  const now = nowIso();
  let updated: Record<string, any> | null = null;
  demoAttendance = demoAttendance.map((record) => {
    if (record.id !== attendanceId) return record;
    updated = { ...record, check_out: now };
    return updated;
  });
  return clone(updated);
};

export const getDemoNotifications = () => clone(demoNotifications);
export const markDemoNotificationRead = (id: string) => {
  demoNotifications = demoNotifications.map((notification) =>
    notification.id === id ? { ...notification, is_read: true } : notification,
  );
};

export const markAllDemoNotificationsRead = () => {
  demoNotifications = demoNotifications.map((notification) => ({
    ...notification,
    is_read: true,
  }));
};

export const clearDemoNotifications = () => {
  demoNotifications = [];
};

export const appendDemoNotifications = (notifications: Record<string, any>[]) => {
  if (!notifications.length) return;
  const withIds = notifications.map((notification) => ({
    ...notification,
    id: nextId("notification"),
    gym_id: DEMO_GYM_ID,
    is_read: false,
    created_at: notification.created_at || nowIso(),
  }));
  demoNotifications = [...withIds, ...demoNotifications];
};

export const getDemoPlatformPlans = () => clone(demoPlatformPlans);
export const getDemoCurrentGymPlan = () => ({
  current_plan_id: demoGymProfile.current_plan_id,
  plan_expires_at: demoGymProfile.plan_expires_at,
  created_at: demoGymProfile.created_at,
});

export const getDemoPlanRequests = () => clone(demoPlanRequests);
export const addDemoPlanRequest = (payload: Record<string, any>) => {
  const created = {
    ...payload,
    id: nextId("plan-request"),
    status: "pending",
    created_at: nowIso(),
    resolved_at: null,
  };
  demoPlanRequests = [created, ...demoPlanRequests];
  return clone(created);
};

export const resolveDemoPlanRequest = ({
  requestId,
  status,
  planId,
}: {
  requestId: string;
  status: string;
  planId: string;
}) => {
  demoPlanRequests = demoPlanRequests.map((request) =>
    request.id === requestId
      ? { ...request, status, resolved_at: nowIso() }
      : request,
  );

  if (status === "approved") {
    demoGymProfile = {
      ...demoGymProfile,
      current_plan_id: planId,
      plan_expires_at: daysAheadIso(30),
    };
  }
};

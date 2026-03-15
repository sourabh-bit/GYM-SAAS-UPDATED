import http from "k6/http";
import { check, sleep } from "k6";
import { randomItem } from "https://jslib.k6.io/k6-utils/1.4.0/index.js";

const SUPABASE_URL = __ENV.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || "";
const OWNER_JWT = __ENV.OWNER_JWT || "";
const MEMBER_JWT = __ENV.MEMBER_JWT || "";
const CHECKIN_MEMBER_IDS = (__ENV.CHECKIN_MEMBER_IDS || "").split(",").map((v) => v.trim()).filter(Boolean);
const PAYMENT_MEMBER_IDS = (__ENV.PAYMENT_MEMBER_IDS || "").split(",").map((v) => v.trim()).filter(Boolean);
const AI_QUESTION = __ENV.AI_QUESTION || "Give me a beginner full-body workout plan.";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required.");
}

const restUrl = `${SUPABASE_URL}/rest/v1`;
const fnUrl = `${SUPABASE_URL}/functions/v1`;

const headers = (jwt) => ({
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  ...(jwt ? { "Authorization": `Bearer ${jwt}` } : {}),
});

export const options = {
  scenarios: {
    dashboard_loads: {
      executor: "constant-vus",
      vus: 500,
      duration: "60s",
      exec: "dashboardLoads",
    },
    checkins: {
      executor: "constant-vus",
      vus: 2000,
      duration: "60s",
      exec: "checkIns",
    },
    ai_chats: {
      executor: "constant-vus",
      vus: 1000,
      duration: "60s",
      exec: "aiChats",
    },
    payments: {
      executor: "constant-vus",
      vus: 200,
      duration: "60s",
      exec: "payments",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<2000"],
  },
};

export function dashboardLoads() {
  if (!OWNER_JWT) {
    sleep(1);
    return;
  }

  const memberRes = http.get(
    `${restUrl}/members?select=id,name,plan_name,created_at&order=created_at.desc&limit=20`,
    { headers: headers(OWNER_JWT) },
  );
  check(memberRes, { "dashboard members ok": (r) => r.status === 200 });

  const attendanceRes = http.get(
    `${restUrl}/attendance?select=id,member_id,check_in,check_out&order=check_in.desc&limit=20`,
    { headers: headers(OWNER_JWT) },
  );
  check(attendanceRes, { "dashboard attendance ok": (r) => r.status === 200 });

  sleep(0.2);
}

export function checkIns() {
  if (!OWNER_JWT || CHECKIN_MEMBER_IDS.length === 0) {
    sleep(1);
    return;
  }

  const memberId = randomItem(CHECKIN_MEMBER_IDS);
  const checkInRes = http.post(
    `${restUrl}/rpc/owner_check_in_member`,
    JSON.stringify({ p_member_id: memberId, p_member_name: "Load Test Member" }),
    { headers: headers(OWNER_JWT) },
  );
  check(checkInRes, { "check-in ok": (r) => r.status === 200 });

  const attendanceId = checkInRes.json() || null;
  if (attendanceId) {
    const checkOutRes = http.post(
      `${restUrl}/rpc/owner_check_out_session`,
      JSON.stringify({ p_attendance_id: attendanceId }),
      { headers: headers(OWNER_JWT) },
    );
    check(checkOutRes, { "check-out ok": (r) => r.status === 200 });
  }

  sleep(0.1);
}

export function aiChats() {
  const res = http.post(
    `${fnUrl}/fitness-ai`,
    JSON.stringify({ question: AI_QUESTION }),
    { headers: headers(MEMBER_JWT) },
  );
  check(res, { "ai chat ok": (r) => r.status === 200 || r.status === 429 });
  sleep(0.2);
}

export function payments() {
  if (!MEMBER_JWT || PAYMENT_MEMBER_IDS.length === 0) {
    sleep(1);
    return;
  }

  const memberId = randomItem(PAYMENT_MEMBER_IDS);
  const res = http.post(
    `${fnUrl}/razorpay-create-order`,
    JSON.stringify({ member_id: memberId }),
    { headers: headers(MEMBER_JWT) },
  );
  check(res, { "payment order ok": (r) => r.status === 200 || r.status === 400 || r.status === 429 });
  sleep(0.2);
}

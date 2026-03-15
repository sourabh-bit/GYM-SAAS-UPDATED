const ownerPathToDemoPageMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/members": "members",
  "/dashboard/trainers": "trainers",
  "/dashboard/subscriptions": "subscriptions",
  "/dashboard/attendance": "attendance",
  "/dashboard/reports": "reports",
  "/dashboard/settings": "settings",
};

const demoPageToOwnerPathMap: Record<string, string> = Object.fromEntries(
  Object.entries(ownerPathToDemoPageMap).map(([path, page]) => [page, path]),
);

export const getDemoModeFromLocation = (
  pathname: string,
  search: string,
): "gym" | "member" | null => {
  if (pathname !== "/demo") return null;
  const mode = new URLSearchParams(search).get("mode");
  return mode === "member" ? "member" : "gym";
};

export const isDemoGymModeFromLocation = (pathname: string, search: string) =>
  getDemoModeFromLocation(pathname, search) === "gym";

export const isDemoMemberModeFromLocation = (
  pathname: string,
  search: string,
) => getDemoModeFromLocation(pathname, search) === "member";

export const isDemoGymMode = () =>
  typeof window !== "undefined" &&
  isDemoGymModeFromLocation(window.location.pathname, window.location.search);

export const isDemoMemberMode = () =>
  typeof window !== "undefined" &&
  isDemoMemberModeFromLocation(window.location.pathname, window.location.search);

export const getDemoOwnerPage = (search: string) =>
  new URLSearchParams(search).get("ownerPage") || "dashboard";

export const toDemoOwnerPath = (dashboardPath: string) => {
  const ownerPage = ownerPathToDemoPageMap[dashboardPath] || "dashboard";
  return `/demo?mode=gym&ownerPage=${ownerPage}`;
};

export const getOwnerPathFromDemoPage = (ownerPage: string) =>
  demoPageToOwnerPathMap[ownerPage] || "/dashboard";

export const getOwnerPathForCurrentMode = (
  dashboardPath: string,
  pathname: string,
  search: string,
) =>
  isDemoGymModeFromLocation(pathname, search)
    ? toDemoOwnerPath(dashboardPath)
    : dashboardPath;


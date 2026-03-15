export type TelemetryEvent = {
  type: string;
  payload: Record<string, unknown>;
  severity?: "low" | "medium" | "high";
  timestamp?: string;
};

const TELEMETRY_WEBHOOK_URL = import.meta.env.VITE_TELEMETRY_WEBHOOK_URL as string | undefined;
const TELEMETRY_WEBHOOK_TOKEN = import.meta.env.VITE_TELEMETRY_WEBHOOK_TOKEN as string | undefined;

export const sendTelemetryEvent = async (event: TelemetryEvent) => {
  if (!TELEMETRY_WEBHOOK_URL) return;

  try {
    const body = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
      source: "fitcore-admin",
    };

    await fetch(TELEMETRY_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(TELEMETRY_WEBHOOK_TOKEN ? { "x-telemetry-token": TELEMETRY_WEBHOOK_TOKEN } : {}),
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Telemetry is optional; ignore failures.
  }
};

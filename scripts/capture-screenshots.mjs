import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.SCREENSHOT_BASE_URL || "http://localhost:8080";
const outputDir = path.resolve("public", "screens");

const targets = [
  { name: "landing", path: "/" },
  { name: "owner-dashboard", path: "/demo?mode=gym&ownerPage=dashboard&screenshot=1" },
  { name: "owner-members", path: "/demo?mode=gym&ownerPage=members&screenshot=1" },
  { name: "owner-attendance", path: "/demo?mode=gym&ownerPage=attendance&screenshot=1" },
  { name: "member-home", path: "/demo?mode=member&memberPage=home&screenshot=1" },
  { name: "member-progress", path: "/demo?mode=member&memberPage=progress&screenshot=1" },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const captureScreenshots = async () => {
  await mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const target of targets) {
    const url = new URL(target.path, baseUrl).toString();
    console.log(`[screenshots] Capturing ${url}`);
    await page.goto(url, { waitUntil: "networkidle" });
    await sleep(1200);
    await page.screenshot({
      path: path.join(outputDir, `${target.name}.png`),
      fullPage: true,
    });
  }

  await browser.close();
  console.log(`[screenshots] Saved to ${outputDir}`);
};

captureScreenshots().catch((error) => {
  console.error("[screenshots] Failed to capture screenshots.");
  console.error(error);
  process.exit(1);
});

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { registerReportPdfFont } from "./pdf-fonts/reportFont";

interface AnalyticsReportData {
  gymName: string;
  reportPeriod: string;
  totalMembers: number;
  totalRevenue: number;
  revenueGrowth: number;
  activeMembers: number;
  expiredMembers: number;
  newMembers: number;
  renewals: number;
  collectionRate: string;
  totalDue: number;
  topPlan: string;
  planPerformance: {
    name: string;
    price: number;
    enrolled: number;
    active: number;
    expired: number;
    revenue: number;
    renewalRate: number;
  }[];
  planWiseRevenue: { name: string; count: number; revenue: number }[];
  statusDistribution: { name: string; value: number }[];
  paymentDistribution: { name: string; value: number }[];
  attentionMembers: {
    name: string;
    plan: string;
    phone: string;
    paymentStatus: string;
    dueAmount: number;
    expiry: string;
  }[];
  allMembers: {
    name: string;
    email: string;
    phone: string;
    plan: string;
    status: string;
    paymentStatus: string;
    dueAmount: number;
    lastPayment: number;
    joined: string;
    expiry: string;
  }[];
  syncedActivity?: {
    sessionCount: number;
    progressCount: number;
    trackedMembers: number;
    avgSessionsPerWeek: number;
  };
}

type PlanSnapshotRow = {
  name: string;
  price: number;
  enrolled: number;
  active: number;
  subscriptions: number;
  revenue: number;
  renewalRate: number;
};

const fmtMoney = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const sharePct = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0.0%");

const buildPlanSnapshotRows = (data: AnalyticsReportData): PlanSnapshotRow[] => {
  const map: Record<string, PlanSnapshotRow> = {};

  data.planPerformance.forEach((p) => {
    const key = p.name || "Unknown";
    const existing = map[key] || {
      name: key,
      price: 0,
      enrolled: 0,
      active: 0,
      subscriptions: 0,
      revenue: 0,
      renewalRate: 0,
    };

    map[key] = {
      ...existing,
      price: p.price || existing.price,
      enrolled: p.enrolled,
      active: p.active,
      revenue: Math.max(existing.revenue, p.revenue || 0),
      renewalRate: p.renewalRate,
    };
  });

  data.planWiseRevenue.forEach((p) => {
    const key = p.name || "Unknown";
    const existing = map[key] || {
      name: key,
      price: 0,
      enrolled: 0,
      active: 0,
      subscriptions: 0,
      revenue: 0,
      renewalRate: 0,
    };

    map[key] = {
      ...existing,
      subscriptions: p.count,
      revenue: Math.max(existing.revenue, p.revenue || 0),
    };
  });

  return Object.values(map).sort((a, b) => b.revenue - a.revenue);
};

const generateAnalyticsReport = (data: AnalyticsReportData) => {
  const doc = new jsPDF();
  registerReportPdfFont(doc);

  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const printDate = format(new Date(), "dd MMM yyyy, hh:mm a");
  const mx = 14;
  const cw = pw - mx * 2;

  const colors = {
    navy: [15, 23, 42] as [number, number, number],
    accent: [56, 138, 255] as [number, number, number],
    ink: [17, 24, 39] as [number, number, number],
    muted: [88, 99, 118] as [number, number, number],
    soft: [244, 246, 250] as [number, number, number],
    border: [214, 220, 231] as [number, number, number],
    ok: [21, 151, 106] as [number, number, number],
    warn: [201, 128, 28] as [number, number, number],
    bad: [205, 59, 59] as [number, number, number],
  };

  const setFont = (style: "normal" | "bold" | "italic" = "normal") => doc.setFont("ReportArial", style);
  const getCurrentPageNumber = () => {
    const info = (doc as any).getCurrentPageInfo?.();
    return typeof info?.pageNumber === "number" ? info.pageNumber : doc.getNumberOfPages();
  };
  const headerDrawnPages = new Set<number>();
  const fitFontSize = (text: string, maxWidth: number, start: number, min = 8) => {
    let size = start;
    doc.setFontSize(size);
    while (size > min && doc.getTextWidth(text) > maxWidth) {
      size -= 0.5;
      doc.setFontSize(size);
    }
    return size;
  };

  const drawHeader = (continuation = false) => {
    doc.setFillColor(...colors.navy);
    doc.rect(0, 0, pw, continuation ? 12 : 36, "F");

    const gymTitle = data.gymName.toUpperCase();
    const reportTitle = "PERFORMANCE INSIGHT";
    setFont("bold");
    doc.setTextColor(255, 255, 255);
    if (continuation) {
      doc.setFontSize(8);
    } else {
      fitFontSize(gymTitle, cw * 0.52, 24, 16);
    }
    doc.text(gymTitle, mx, continuation ? 8 : 13.5);

    setFont("bold");
    doc.setTextColor(236, 241, 250);
    if (continuation) {
      doc.setFontSize(8);
    } else {
      fitFontSize(reportTitle, cw * 0.4, 18, 12);
    }
    doc.text(
      reportTitle,
      pw - mx,
      continuation ? 8 : 13.5,
      { align: "right" },
    );

    if (!continuation) {
      setFont("normal");
      doc.setTextColor(220, 228, 244);
      doc.setFontSize(8);
      doc.text(data.reportPeriod, mx, 25.5);
      doc.text(`Generated: ${printDate}`, pw - mx, 25.5, { align: "right" });

      const badge = `${data.totalMembers} Members`;
      setFont("bold");
      doc.setFontSize(7.5);
      const bw = doc.getTextWidth(badge) + 10;
      doc.setFillColor(39, 105, 226);
      doc.roundedRect(pw - mx - bw, 28.5, bw, 7, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.text(badge, pw - mx - bw / 2, 33.1, { align: "center" });
    }

    headerDrawnPages.add(getCurrentPageNumber());
  };
  const ensureContinuationHeader = () => {
    const page = getCurrentPageNumber();
    if (!headerDrawnPages.has(page)) drawHeader(true);
  };

  let y = 41;
  drawHeader(false);

  const ensureRoom = (needed: number) => {
    if (y + needed <= ph - 24) return;
    doc.addPage();
    drawHeader(true);
    y = 19;
  };

  const section = (title: string, subtitle?: string) => {
    ensureRoom(16);
    setFont("bold");
    doc.setTextColor(...colors.ink);
    doc.setFontSize(9.5);
    doc.text(title, mx, y);
    if (subtitle) {
      setFont("normal");
      doc.setTextColor(...colors.muted);
      doc.setFontSize(7.2);
      doc.text(subtitle, mx, y + 4.6);
      y += 8.2;
    } else {
      y += 5.2;
    }
  };

  // Executive KPIs
  section("Executive Snapshot", "Core metrics for the selected period");

  const kpis = [
    { label: "Revenue", value: fmtMoney(data.totalRevenue), tone: "ink" as const },
    { label: "Growth", value: `${data.revenueGrowth >= 0 ? "+" : ""}${data.revenueGrowth}%`, tone: data.revenueGrowth >= 0 ? ("ok" as const) : ("bad" as const) },
    { label: "Active", value: String(data.activeMembers), tone: "ok" as const },
    { label: "Expired", value: String(data.expiredMembers), tone: "bad" as const },
    { label: "New", value: String(data.newMembers), tone: "ink" as const },
    { label: "Renewals", value: String(data.renewals), tone: "warn" as const },
    { label: "Collection", value: data.collectionRate, tone: "ok" as const },
    { label: "Due", value: fmtMoney(data.totalDue), tone: data.totalDue > 0 ? ("bad" as const) : ("ok" as const) },
    { label: "Top Plan", value: data.topPlan || "--", tone: "ink" as const },
  ];

  const cardGap = 4;
  const cardW = (cw - cardGap * 2) / 3;
  const cardH = 17;

  kpis.forEach((kpi, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const x = mx + col * (cardW + cardGap);
    const cy = y + row * (cardH + 3);

    doc.setFillColor(...colors.soft);
    doc.roundedRect(x, cy, cardW, cardH, 1.8, 1.8, "F");
    doc.setDrawColor(...colors.border);
    doc.setLineWidth(0.25);
    doc.roundedRect(x, cy, cardW, cardH, 1.8, 1.8, "S");

    setFont("normal");
    doc.setTextColor(...colors.muted);
    doc.setFontSize(6.2);
    doc.text(kpi.label.toUpperCase(), x + 3.5, cy + 5.5);

    setFont("bold");
    doc.setTextColor(...colors[kpi.tone]);
    doc.setFontSize(9.8);
    doc.text(kpi.value, x + 3.5, cy + 12.4);
  });

  y += Math.ceil(kpis.length / 3) * (cardH + 3) + 5;

  if (data.syncedActivity) {
    section("Member Sync Activity", "Workout and progress data synced from member portal");
    const syncCards = [
      { label: "Workout Logs", value: String(data.syncedActivity.sessionCount) },
      { label: "Progress Entries", value: String(data.syncedActivity.progressCount) },
      { label: "Tracked Members", value: String(data.syncedActivity.trackedMembers) },
      { label: "Avg Sessions/Week", value: data.syncedActivity.avgSessionsPerWeek.toFixed(1) },
    ];

    const syncGap = 4;
    const syncWidth = (cw - syncGap * (syncCards.length - 1)) / syncCards.length;
    const syncHeight = 14;

    syncCards.forEach((card, index) => {
      const x = mx + index * (syncWidth + syncGap);
      doc.setFillColor(...colors.soft);
      doc.roundedRect(x, y, syncWidth, syncHeight, 1.8, 1.8, "F");
      doc.setDrawColor(...colors.border);
      doc.setLineWidth(0.25);
      doc.roundedRect(x, y, syncWidth, syncHeight, 1.8, 1.8, "S");

      setFont("normal");
      doc.setTextColor(...colors.muted);
      doc.setFontSize(6);
      doc.text(card.label.toUpperCase(), x + 3, y + 4.8);

      setFont("bold");
      doc.setTextColor(...colors.ink);
      doc.setFontSize(9.2);
      doc.text(card.value, x + 3, y + 10.8);
    });

    y += syncHeight + 6;
  }

  const tableBase = {
    margin: { left: mx, right: mx },
    styles: {
      font: "ReportArial",
      fontSize: 7.3,
      cellPadding: 3.2,
      lineColor: colors.border,
      lineWidth: 0.2,
      textColor: colors.ink,
      valign: "middle",
    } as any,
    headStyles: {
      font: "ReportArial",
      fontStyle: "bold" as const,
      fontSize: 7,
      cellPadding: 3.3,
      fillColor: colors.navy,
      textColor: [255, 255, 255] as [number, number, number],
    },
    alternateRowStyles: { fillColor: [249, 251, 255] as [number, number, number] },
    theme: "grid" as const,
  };

  // Consolidated plan snapshot
  const planRows = buildPlanSnapshotRows(data);
  section("Plan Snapshot", "Consolidated view of plan performance and revenue");

  if (planRows.length === 0) {
    setFont("italic");
    doc.setTextColor(...colors.muted);
    doc.setFontSize(7.4);
    doc.text("No plan data available for this period.", mx, y + 1);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Plan", "Price", "Enrolled", "Active", "Subs", "Revenue", "Share", "Renewal"]],
      body: planRows.map((p) => [
        p.name,
        fmtMoney(p.price),
        p.enrolled,
        p.active,
        p.subscriptions,
        fmtMoney(p.revenue),
        sharePct(p.revenue, data.totalRevenue),
        `${p.renewalRate}%`,
      ]),
      ...tableBase,
      didParseCell: (hook: any) => {
        if (hook.section !== "body") return;

        if (hook.column.index === 3) {
          hook.cell.styles.textColor = colors.ok;
          hook.cell.styles.fontStyle = "bold";
        }
        if (hook.column.index === 5) {
          hook.cell.styles.fontStyle = "bold";
        }
        if (hook.column.index === 7) {
          const rate = parseFloat(String(hook.cell.raw));
          hook.cell.styles.textColor = rate >= 70 ? colors.ok : rate >= 40 ? colors.warn : colors.bad;
          hook.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage: ensureContinuationHeader,
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Distribution compact summary
  section("Distribution Summary", "Member status and payment breakdown");

  const distRows = [
    ...data.statusDistribution.map((s, i) => [i === 0 ? "Member Status" : "", cap(s.name), s.value, sharePct(s.value, data.totalMembers)]),
    ...data.paymentDistribution.map((s, i) => [i === 0 ? "Payment Status" : "", cap(s.name), s.value, sharePct(s.value, data.totalMembers)]),
  ];

  if (distRows.length === 0) {
    setFont("italic");
    doc.setTextColor(...colors.muted);
    doc.setFontSize(7.4);
    doc.text("No distribution rows available.", mx, y + 1);
    y += 8;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Group", "Label", "Count", "Share"]],
      body: distRows,
      ...tableBase,
      didParseCell: (hook: any) => {
        if (hook.section !== "body") return;

        if (hook.column.index === 0 && hook.cell.raw) {
          hook.cell.styles.fontStyle = "bold";
          hook.cell.styles.textColor = colors.muted;
        }

        if (hook.column.index === 1) {
          const row = String(hook.cell.raw).toLowerCase();
          if (row === "active" || row === "paid") hook.cell.styles.textColor = colors.ok;
          if (row === "pending") hook.cell.styles.textColor = colors.warn;
          if (row === "expired" || row === "overdue") hook.cell.styles.textColor = colors.bad;
        }
      },
      didDrawPage: ensureContinuationHeader,
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // Appendix starts on new page for cleaner executive first page
  doc.addPage();
  drawHeader(true);
  y = 19;

  section("Appendix A - Members Requiring Attention", "Action list for pending and overdue follow-up");
  if (data.attentionMembers.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Member", "Plan", "Phone", "Status", "Due Amount", "Expiry"]],
      body: data.attentionMembers.map((m) => [
        m.name,
        m.plan,
        m.phone,
        cap(m.paymentStatus),
        fmtMoney(m.dueAmount),
        m.expiry,
      ]),
      ...tableBase,
      didParseCell: (hook: any) => {
        if (hook.section !== "body") return;

        if (hook.column.index === 3) {
          const v = String(hook.cell.raw).toLowerCase();
          hook.cell.styles.textColor = v === "overdue" ? colors.bad : v === "pending" ? colors.warn : colors.ok;
          hook.cell.styles.fontStyle = "bold";
        }
        if (hook.column.index === 4) {
          hook.cell.styles.textColor = colors.bad;
          hook.cell.styles.fontStyle = "bold";
        }
      },
      didDrawPage: ensureContinuationHeader,
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  } else {
    setFont("italic");
    doc.setTextColor(...colors.muted);
    doc.setFontSize(7.4);
    doc.text("No members currently require attention.", mx, y + 1);
    y += 8;
  }

  section("Appendix B - Complete Member Directory");
  autoTable(doc, {
    startY: y,
    head: [["Name", "Plan", "Status", "Payment", "Due", "Last Paid", "Joined", "Expiry"]],
    body: data.allMembers.map((m) => [
      m.name,
      m.plan,
      cap(m.status),
      cap(m.paymentStatus),
      fmtMoney(m.dueAmount),
      fmtMoney(m.lastPayment),
      m.joined,
      m.expiry,
    ]),
    ...tableBase,
    styles: { ...tableBase.styles, fontSize: 6.8, cellPadding: 2.8 },
    didParseCell: (hook: any) => {
      if (hook.section !== "body") return;

      if (hook.column.index === 2) {
        const status = String(hook.cell.raw).toLowerCase();
        hook.cell.styles.textColor = status === "active" ? colors.ok : status === "expired" ? colors.bad : colors.warn;
        hook.cell.styles.fontStyle = "bold";
      }
      if (hook.column.index === 3) {
        const pay = String(hook.cell.raw).toLowerCase();
        hook.cell.styles.textColor = pay === "paid" ? colors.ok : pay === "overdue" ? colors.bad : pay === "pending" ? colors.warn : colors.ink;
        hook.cell.styles.fontStyle = "bold";
      }
    },
    didDrawPage: ensureContinuationHeader,
  });

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(...colors.navy);
    doc.rect(0, ph - 11, pw, 11, "F");
    doc.setFillColor(...colors.accent);
    doc.rect(0, ph - 11, pw, 0.6, "F");

    setFont("normal");
    doc.setTextColor(195, 205, 224);
    doc.setFontSize(6.2);
    doc.text(`${data.gymName} | Performance Report | ${printDate} | Confidential`, mx, ph - 4.2);

    setFont("bold");
    doc.setTextColor(255, 255, 255);
    doc.text(`${i} / ${totalPages}`, pw - mx, ph - 4.2, { align: "right" });
  }

  doc.save(`${data.gymName.replace(/\s+/g, "-").toLowerCase()}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
};

export default generateAnalyticsReport;
export type { AnalyticsReportData };

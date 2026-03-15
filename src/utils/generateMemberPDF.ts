import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface MemberReportData {
  gymName: string;
  name: string;
  email: string;
  phone: string;
  joinDate: string;
  plan: string;
  planPrice: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  status: string;
  totalPaid: string;
  totalPending: string;
  lateFees: string;
  payments: { month: string; invoice: string; paidDate: string; amount: string; status: string }[];
  totalVisits: number;
  avgVisitsPerMonth: number;
  consistency: string;
}

const generateMemberPDF = (member: MemberReportData) => {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const reportId = `RPT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
  const printDate = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  const mx = 16;
  const cw = pw - mx * 2;

  // Palette
  const navy: [number, number, number] = [15, 23, 42];
  const accent: [number, number, number] = [59, 130, 246];
  const white: [number, number, number] = [255, 255, 255];
  const snow: [number, number, number] = [249, 250, 251];
  const cloud: [number, number, number] = [243, 244, 246];
  const border: [number, number, number] = [209, 213, 219];
  const ink: [number, number, number] = [17, 24, 39];
  const slate: [number, number, number] = [75, 85, 99];
  const muted: [number, number, number] = [156, 163, 175];
  const emerald: [number, number, number] = [16, 185, 129];
  const rose: [number, number, number] = [239, 68, 68];
  const amber: [number, number, number] = [245, 158, 11];

  // ── HEADER (page 1 only) ──
  const drawHeader = () => {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pw, 40, "F");
    doc.setFillColor(...accent);
    doc.rect(0, 40, pw, 1.2, "F");

    doc.setTextColor(...white);
    doc.setFontSize(17);
    doc.setFont("helvetica", "bold");
    doc.text(member.gymName.toUpperCase(), mx, 15);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 210, 230);
    doc.text("MEMBER STATEMENT", mx, 23);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text(member.name, mx, 33);

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 190, 210);
    doc.text(`Ref: ${reportId}`, pw - mx, 13, { align: "right" });
    doc.text(printDate, pw - mx, 19, { align: "right" });

    // Status badge
    const sc = member.status.toLowerCase() === "active" ? emerald : member.status.toLowerCase() === "expired" ? rose : amber;
    const st = member.status.toUpperCase();
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    const stw = doc.getTextWidth(st) + 10;
    doc.setFillColor(...sc);
    doc.roundedRect(pw - mx - stw, 26, stw, 8, 2, 2, "F");
    doc.setTextColor(...white);
    doc.text(st, pw - mx - stw / 2, 31.5, { align: "center" });
  };

  // Continuation header (page 2+)
  const drawContHeader = () => {
    doc.setFillColor(...navy);
    doc.rect(0, 0, pw, 12, "F");
    doc.setFillColor(...accent);
    doc.rect(0, 12, pw, 0.6, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text(member.gymName.toUpperCase(), mx, 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 210, 230);
    doc.text(`Member Statement — ${member.name}`, pw - mx, 8, { align: "right" });
  };

  drawHeader();
  let y = 48;

  // ── Section title ──
  const section = (title: string, num: string) => {
    if (y > ph - 50) { doc.addPage(); drawContHeader(); y = 20; }
    y += 3;
    doc.setFillColor(...cloud);
    doc.rect(mx, y, cw, 9, "F");
    doc.setFillColor(...accent);
    doc.rect(mx, y, 2.5, 9, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ink);
    doc.text(`${num}.  ${title}`, mx + 7, y + 6.5);
    y += 14;
  };

  // ── Inline field: "Label  :  Value" on same line ──
  const fieldRow = (label: string, value: string, fy: number, x: number, labelW: number) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...slate);
    doc.text(label, x, fy);
    doc.setTextColor(...muted);
    doc.text(":", x + labelW, fy);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ink);
    doc.text(value || "—", x + labelW + 4, fy);
  };

  // ── 1. MEMBER INFORMATION ──
  section("Member Information", "01");

  const rowH = 8;
  const infoRows = [
    { l: "Full Name", v: member.name, l2: "Current Plan", v2: member.plan },
    { l: "Email", v: member.email, l2: "Plan Price", v2: member.planPrice },
    { l: "Phone", v: member.phone, l2: "Sub. Start", v2: member.subscriptionStart },
    { l: "Joined", v: member.joinDate, l2: "Sub. End", v2: member.subscriptionEnd },
  ];

  const infoH = 6 + infoRows.length * rowH + 2;
  doc.setFillColor(...snow);
  doc.roundedRect(mx, y, cw, infoH, 2, 2, "F");
  doc.setDrawColor(...border);
  doc.setLineWidth(0.3);
  doc.roundedRect(mx, y, cw, infoH, 2, 2, "S");

  const lx = mx + 6;
  const rx = pw / 2 + 4;

  infoRows.forEach((r, i) => {
    const fy = y + 7 + i * rowH;
    fieldRow(r.l, r.v, fy, lx, 20);
    fieldRow(r.l2, r.v2, fy, rx, 22);
    if (i < infoRows.length - 1) {
      doc.setDrawColor(...cloud);
      doc.setLineWidth(0.15);
      doc.line(mx + 4, fy + 3.5, pw - mx - 4, fy + 3.5);
    }
  });

  y += infoH + 6;

  // ── 2. FINANCIAL SUMMARY ──
  section("Financial Summary", "02");

  const cardW = (cw - 10) / 3;
  const finCards = [
    { label: "Total Paid", value: member.totalPaid, color: emerald },
    { label: "Outstanding Dues", value: member.totalPending, color: rose },
    { label: "Late Fees", value: member.lateFees, color: amber },
  ];
  finCards.forEach((c, i) => {
    const cx = mx + i * (cardW + 5);
    doc.setFillColor(...snow);
    doc.roundedRect(cx, y, cardW, 26, 2, 2, "F");
    doc.setDrawColor(...border);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, 26, 2, 2, "S");
    doc.setFillColor(...c.color);
    doc.roundedRect(cx, y, cardW, 2.5, 2, 2, "F");
    doc.setFillColor(...snow);
    doc.rect(cx, y + 2, cardW, 1.5, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...slate);
    doc.text(c.label.toUpperCase(), cx + cardW / 2, y + 10, { align: "center" });
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...c.color);
    doc.text(c.value, cx + cardW / 2, y + 20, { align: "center" });
  });
  y += 34;

  // ── 3. PAYMENT HISTORY ──
  section("Payment History", "03");
  if (member.payments.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Month", "Invoice", "Paid Date", "Amount", "Status"]],
      body: member.payments.map(p => [p.month, p.invoice, p.paidDate, p.amount, p.status]),
      margin: { left: mx, right: mx },
      styles: { fontSize: 8, cellPadding: 4.5, lineColor: border, lineWidth: 0.2, textColor: ink },
      headStyles: { fillColor: navy, textColor: white, fontStyle: "bold", fontSize: 7.5, cellPadding: 5 },
      alternateRowStyles: { fillColor: cloud },
      theme: "grid",
      columnStyles: { 4: { fontStyle: "bold" as const } },
      didParseCell: (d: any) => {
        if (d.section === "body" && d.column.index === 4) {
          d.cell.styles.textColor = d.cell.raw === "Paid" ? emerald : d.cell.raw === "Partial" ? amber : rose;
        }
      },
      didDrawPage: (d: any) => {
        if (d.pageNumber > 1) drawContHeader();
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFillColor(...cloud);
    doc.roundedRect(mx, y, cw, 12, 2, 2, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...slate);
    doc.text("No payment records available.", mx + 8, y + 8);
    y += 18;
  }

  // ── 4. ATTENDANCE SUMMARY ──
  if (y > ph - 60) { doc.addPage(); drawContHeader(); y = 20; }
  section("Attendance Summary", "04");

  const attCards = [
    { label: "Total Visits", value: String(member.totalVisits) },
    { label: "Avg Visits / Month", value: String(member.avgVisitsPerMonth) },
    { label: "Consistency Rate", value: member.consistency },
  ];
  attCards.forEach((c, i) => {
    const cx = mx + i * (cardW + 5);
    doc.setFillColor(...snow);
    doc.roundedRect(cx, y, cardW, 26, 2, 2, "F");
    doc.setDrawColor(...border);
    doc.setLineWidth(0.3);
    doc.roundedRect(cx, y, cardW, 26, 2, 2, "S");
    doc.setFillColor(...accent);
    doc.roundedRect(cx, y, cardW, 2.5, 2, 2, "F");
    doc.setFillColor(...snow);
    doc.rect(cx, y + 2, cardW, 1.5, "F");

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...slate);
    doc.text(c.label.toUpperCase(), cx + cardW / 2, y + 10, { align: "center" });
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ink);
    doc.text(c.value, cx + cardW / 2, y + 20, { align: "center" });
  });

  // ── FOOTER on all pages ──
  const tp = doc.getNumberOfPages();
  for (let i = 1; i <= tp; i++) {
    doc.setPage(i);
    doc.setFillColor(...navy);
    doc.rect(0, ph - 14, pw, 14, "F");
    doc.setFillColor(...accent);
    doc.rect(0, ph - 14, pw, 0.6, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(180, 190, 210);
    doc.text(`${member.gymName}  •  Member Statement  •  ${printDate}  •  Confidential`, mx, ph - 5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...white);
    doc.text(`${i} / ${tp}`, pw - mx, ph - 5, { align: "right" });
  }

  doc.save(`${member.name.replace(/\s+/g, "_").toLowerCase()}_statement_${new Date().toISOString().split("T")[0]}.pdf`);
};

export default generateMemberPDF;
export type { MemberReportData };

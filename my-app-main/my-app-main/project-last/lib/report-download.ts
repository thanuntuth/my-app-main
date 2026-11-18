
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { remainingValue, yearlyDepreciation } from "./depreciation";
import type { Asset, Branch, Repair } from "./types";

type Report = {
  id: number;
  name: string;
  month: string;
  year: string;
  fileType: string;
};

type Row = Record<string, string | number>;

function getReportRows(
  report: Report,
  assets: Asset[],
  branches: Branch[],
  repairs: Repair[]
): Row[] {
  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name || "-";

  const assetName = (id: string) =>
    assets.find((a) => a.id === id)?.name || "ไม่พบข้อมูล";

  const months = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
    "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
    "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
  ];

  const monthIndex = months.indexOf(report.month);
  const year = Number(report.year) - 543;

  if (report.name.includes("ซ่อม")) {
    return repairs
      .filter((r) => {
        const date = new Date(r.sentDate);
        return date.getMonth() === monthIndex &&
          date.getFullYear() === year;
      })
      .map((r) => ({
        "รหัสงานซ่อม": r.id,
        "รหัสทรัพย์สิน": r.assetId,
        "ชื่อทรัพย์สิน": assetName(r.assetId),
        "ร้านซ่อม": r.vendor,
        "วันที่ส่งซ่อม": r.sentDate,
        "รายละเอียด": r.note || "-",
        "ค่าใช้จ่าย": r.cost || 0,
        "สถานะ": r.status === "done" ? "ซ่อมเสร็จแล้ว" : "กำลังซ่อม",
        "วันที่ซ่อมเสร็จ": r.doneDate || "-",
      }));
  }

  if (report.name.includes("เสื่อม")) {
    const endDate = new Date(year, monthIndex + 1, 0, 23, 59, 59);

    return assets.map((a) => {
      const purchaseDate = new Date(a.purchaseDate);
      const years = Math.max(
        0,
        (endDate.getTime() - purchaseDate.getTime()) /
        (365.25 * 24 * 60 * 60 * 1000)
      );

      const depreciationRate =
        a.usefulLifeYears > 0 ? 100 / a.usefulLifeYears : 0;
      const annual = yearlyDepreciation(a.price, a.usefulLifeYears);
      const remaining = remainingValue(a, endDate);

      return {
        "รหัสทรัพย์สิน": a.id,
        "ชื่อทรัพย์สิน": a.name,
        "ประเภท": a.type,
        "ราคาทุน": a.price,
        "อัตราค่าเสื่อม (%)": depreciationRate,
        "จำนวนปีที่ใช้งาน": Number(years.toFixed(2)),
        "ค่าเสื่อมราคาต่อปี": Number(annual.toFixed(2)),
        "มูลค่าคงเหลือ": Number(remaining.toFixed(2)),
        "สาขา": branchName(a.branchId),
      };
    });
  }

  return assets.map((a) => ({
    "รหัสทรัพย์สิน": a.id,
    "ชื่อทรัพย์สิน": a.name,
    "ประเภท": a.type,
    "ราคาทุน": a.price,
    "วันที่ซื้อ": a.purchaseDate,
    "ผู้ขาย": a.vendor,
    "วันหมดประกัน": a.warrantyUntil || "-",
    "อัตราค่าเสื่อม (%)":
      a.usefulLifeYears > 0 ? 100 / a.usefulLifeYears : 0,
    "สาขา": branchName(a.branchId),
    "สถานะ": a.status,
    "รับทรัพย์สินแล้ว": a.received ? "รับแล้ว" : "ยังไม่รับ",
  }));
}

function downloadExcel(report: Report, rows: Row[]) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  if (rows.length > 0) {
    worksheet["!cols"] = Object.keys(rows[0]).map(() => ({
      wch: 22,
    }));
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, "รายงาน");

  XLSX.writeFile(
    workbook,
    `${report.name}_${report.month}_${report.year}.xlsx`
  );
}

async function downloadPDF(report: Report, rows: Row[]) {
  const container = document.createElement("div");

  container.style.cssText = `
    position: fixed;
    left: -10000px;
    top: 0;
    width: 1100px;
    padding: 40px;
    background: white;
    color: #222;
    font-family: Tahoma, Arial, sans-serif;
  `;

  const headers = Object.keys(rows[0] || {});

  container.innerHTML = `
    <h1 style="color:#00786F;font-size:28px">
      ${report.name}
    </h1>
    <p>ประจำเดือน ${report.month} ${report.year}</p>
    <p>จำนวนทั้งหมด ${rows.length} รายการ</p>
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr>
          ${headers.map((h) => `
            <th style="background:#00786F;color:white;padding:12px;border:1px solid #ddd">
              ${h}
            </th>
          `).join("")}
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            ${headers.map((h) => `
              <td style="padding:10px;border:1px solid #ddd">
                ${String(row[h] ?? "-")}
              </td>
            `).join("")}
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: "#ffffff",
    });

    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const width = pageWidth - margin * 2;
    const height = pageHeight - margin * 2;

    const totalHeight = canvas.height * width / canvas.width;
    const pages = Math.ceil(totalHeight / height);

    for (let i = 0; i < pages; i++) {
      if (i > 0) pdf.addPage();

      const sourceY = i * height * canvas.width / width;
      const sourceHeight = Math.min(
        height * canvas.width / width,
        canvas.height - sourceY
      );

      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;

      const context = pageCanvas.getContext("2d");
      if (!context) continue;

      context.drawImage(
        canvas,
        0, sourceY, canvas.width, sourceHeight,
        0, 0, canvas.width, sourceHeight
      );

      pdf.addImage(
        pageCanvas.toDataURL("image/png"),
        "PNG",
        margin,
        margin,
        width,
        sourceHeight * width / canvas.width
      );
    }

    pdf.save(`${report.name}_${report.month}_${report.year}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function downloadReport(
  report: Report,
  assets: Asset[],
  branches: Branch[],
  repairs: Repair[]
) {
  const rows = getReportRows(report, assets, branches, repairs);

  if (report.fileType.toLowerCase() === "pdf") {
    await downloadPDF(report, rows);
  } else {
    downloadExcel(report, rows);
  }
}

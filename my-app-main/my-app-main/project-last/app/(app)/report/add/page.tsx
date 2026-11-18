
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";

const STORAGE_KEY = "saved-reports";

const reportTypes = [
  { id: "assets", name: "รายงานทรัพย์สิน" },
  { id: "repair", name: "รายงานการซ่อม" },
  { id: "depreciation", name: "รายงานค่าเสื่อมราคา" },
];

const months = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export default function AddReportPage() {
  const router = useRouter();

  const [reportType, setReportType] = useState("assets");
  const [month, setMonth] = useState("มกราคม");
  const [year, setYear] = useState("2569");
  const [fileType, setFileType] = useState("pdf");
  const [saving, setSaving] = useState(false);

  const handleSubmit = () => {
    if (saving) return;

    const selectedReport = reportTypes.find(
      (report) => report.id === reportType
    );

    if (!selectedReport) return;

    setSaving(true);

    const newReport = {
      id: Date.now(),
      name: selectedReport.name,
      month,
      year,
      fileType,
      createdAt: new Date().toISOString(),
    };

    try {
      const existingReports = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (!Array.isArray(existingReports)) {
        throw new Error("ข้อมูลรายงานไม่ถูกต้อง");
      }

      const updatedReports = [
        newReport,
        ...existingReports,
      ];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedReports)
      );

      // แจ้งหน้ารายงานให้อัปเดตข้อมูล
      window.dispatchEvent(
        new Event("reports-updated")
      );

      // กลับไปหน้ารายงาน
      router.push("/report");
    } catch (error) {
      console.error("บันทึกรายงานไม่สำเร็จ:", error);
      alert("ไม่สามารถบันทึกรายงานได้ กรุณาลองใหม่อีกครั้ง");
      setSaving(false);
    }
  };

  return (
    <main className="w-full space-y-6 pb-10">
      {/* หัวข้อ */}
      <div>
        <PageTitle>เพิ่มรายงาน</PageTitle>
        <p className="mt-1 text-sm text-gray-500">
          เลือกประเภทรายงาน เดือน ปี และรูปแบบไฟล์ที่ต้องการ
        </p>
      </div>

      {/* เลือกประเภทรายงาน */}
      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              1. เลือกประเภทรายงาน
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              เลือกประเภทรายงานที่ต้องการจัดทำ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {reportTypes.map((report) => {
              const selected = reportType === report.id;

              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setReportType(report.id)}
                  className={`rounded-xl border p-5 text-left transition ${
                    selected
                      ? "border-[#00786F] bg-[#F0F9F8] ring-1 ring-[#00786F]"
                      : "border-gray-200 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-800">
                      {report.name}
                    </span>

                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected
                          ? "border-[#00786F] bg-[#00786F] text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* เลือกเดือนและปี */}
      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              2. เลือกเดือนและปี
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              เลือกช่วงเวลาของรายงานที่ต้องการ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                เดือน
              </label>

              <select
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#00786F] focus:ring-2 focus:ring-[#00786F]/20"
              >
                {months.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                ปี
              </label>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-[#00786F] focus:ring-2 focus:ring-[#00786F]/20"
              >
                {Array.from(
                  { length: 10 },
                  (_, i) => 2569 - i
                ).map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* เลือกรูปแบบไฟล์ */}
      <Card>
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              3. เลือกรูปแบบไฟล์
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              เลือกรูปแบบไฟล์ที่ต้องการ
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* PDF */}
            <button
              type="button"
              onClick={() => setFileType("pdf")}
              className={`flex items-center gap-4 rounded-xl border p-5 text-left transition ${
                fileType === "pdf"
                  ? "border-red-300 bg-red-50 ring-1 ring-red-300"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-red-100 font-bold text-red-700">
                PDF
              </span>

              <span>
                <span className="block font-medium text-gray-800">
                  PDF
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  ไฟล์เอกสาร PDF
                </span>
              </span>
            </button>

            {/* Excel */}
            <button
              type="button"
              onClick={() => setFileType("excel")}
              className={`flex items-center gap-4 rounded-xl border p-5 text-left transition ${
                fileType === "excel"
                  ? "border-green-300 bg-green-50 ring-1 ring-green-300"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-green-100 font-bold text-green-700">
                XLS
              </span>

              <span>
                <span className="block font-medium text-gray-800">
                  Excel
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  ไฟล์ตาราง Excel
                </span>
              </span>
            </button>
          </div>
        </div>
      </Card>

      {/* ปุ่มด้านล่าง */}
      <div className="flex justify-end gap-3">
        <Link
          href="/report"
          className="rounded-lg border border-gray-300 px-5 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
        >
          ยกเลิก
        </Link>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="rounded-lg bg-[#00786F] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#00665F] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "กำลังบันทึก..." : "เพิ่มรายงาน"}
        </button>
      </div>
    </main>
  );
}

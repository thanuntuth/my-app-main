
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, PageTitle } from "@/components/ui";
import { useAppData } from "@/lib/storage";
import { downloadReport } from "@/lib/report-download";

const STORAGE_KEY = "saved-reports";

type Report = {
  id: number;
  name: string;
  month: string;
  year: string;
  fileType: string;
  createdAt?: string;
};

const initialReports: Report[] = [
  {
    id: 1,
    name: "รายงานทรัพย์สินรวม",
    month: "มกราคม",
    year: "2569",
    fileType: "pdf",
  },
  {
    id: 2,
    name: "รายงานการซ่อม",
    month: "กุมภาพันธ์",
    year: "2569",
    fileType: "excel",
  },
  {
    id: 3,
    name: "รายงานค่าเสื่อมราคา",
    month: "มีนาคม",
    year: "2569",
    fileType: "pdf",
  },
];

export default function ReportsPage() {
  const { assets, branches, repairs } = useAppData();

  const [reports, setReports] = useState<Report[]>(initialReports);
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    const loadReports = () => {
      try {
        const savedReports: Report[] = JSON.parse(
          localStorage.getItem(STORAGE_KEY) || "[]"
        );

        if (!Array.isArray(savedReports)) return;

        setReports([
          ...savedReports,
          ...initialReports,
        ]);
      } catch (error) {
        console.error("โหลดรายงานไม่สำเร็จ:", error);
      }
    };

    loadReports();

    window.addEventListener("reports-updated", loadReports);
    window.addEventListener("storage", loadReports);

    return () => {
      window.removeEventListener("reports-updated", loadReports);
      window.removeEventListener("storage", loadReports);
    };
  }, []);

  const handleDownload = async (report: Report) => {
    try {
      setDownloading(report.id);

      await downloadReport(
        report,
        assets,
        branches,
        repairs
      );
    } catch (error) {
      console.error("ดาวน์โหลดรายงานไม่สำเร็จ:", error);
      alert("ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <main className="w-full space-y-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle>รายงาน</PageTitle>
          <p className="mt-1 text-sm text-gray-500">
            ตรวจสอบและดาวน์โหลดรายงานข้อมูลทรัพย์สิน
          </p>
        </div>

        <Link
          href="/report/add"
          className="inline-flex items-center justify-center rounded-lg bg-[#00786F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#00665F] active:scale-[0.98]"
        >
          + เพิ่มรายงาน
        </Link>
      </div>

      <Card>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                รายการรายงาน
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                รายงานทั้งหมด {reports.length} รายการ
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-600">
              อัปเดตอัตโนมัติ
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-6 py-4 font-medium">ลำดับ</th>
                  <th className="px-6 py-4 font-medium">รายงาน</th>
                  <th className="px-6 py-4 font-medium">ประจำเดือน</th>
                  <th className="px-6 py-4 text-center font-medium">
                    รูปแบบไฟล์
                  </th>
                  <th className="px-6 py-4 text-center font-medium">
                    ดาวน์โหลด
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {reports.map((report, index) => (
                  <tr
                    key={`${report.id}-${index}`}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-6 py-5 text-gray-500">
                      {index + 1}
                    </td>

                    <td className="px-6 py-5 font-medium text-gray-800">
                      {report.name}
                    </td>

                    <td className="px-6 py-5 text-gray-700">
                      {report.month} {report.year}
                    </td>

                    <td className="px-6 py-5 text-center">
                      <span
                        className={`inline-flex rounded-lg px-3 py-1.5 text-xs font-medium ${
                          report.fileType.toLowerCase() === "pdf"
                            ? "bg-red-50 text-red-700"
                            : "bg-green-50 text-green-700"
                        }`}
                      >
                        {report.fileType.toLowerCase() === "pdf"
                          ? "PDF"
                          : "Excel"}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-center">
                      <button
                        onClick={() => handleDownload(report)}
                        disabled={downloading !== null}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00786F] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#00665F] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {downloading === report.id ? (
                          "กำลังสร้างไฟล์..."
                        ) : (
                          <>
                            <span>↓</span>
                            ดาวน์โหลด
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}

                {reports.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      ยังไม่มีรายการรายงาน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </main>
  );
}

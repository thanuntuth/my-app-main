"use client";

import { useState,useEffect } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/ui";
import { STATUS_LABEL } from "@/lib/labels";
import { KEYS, useAppData } from "@/lib/storage";
import { baht, remainingValue } from "@/lib/depreciation";
import { lostAssetIds } from "@/lib/utils";
import type { Asset, AssetStatus } from "@/lib/types";
import { Stat } from "./parts";

const STATUS_STYLE: Record<AssetStatus, string> = {
  normal: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  damaged: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
  "needs-repair": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "in-transit": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};
const LOST_STYLE = "bg-red-50 text-red-700 ring-1 ring-red-200";

type Filter = "all" | "normal" | "issue" | "lost";

export default function AssetListTab() {
  const router = useRouter();
  const { assets, branches, rounds } = useAppData();
    const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const lost = lostAssetIds(rounds); // ทรัพย์สินที่ผลนับล่าสุดคือ "ไม่พบ"

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  const statusText = (a: Asset) => (lost.has(a.id) ? "สูญหาย" : STATUS_LABEL[a.status]);
  const isIssue = (a: Asset) => a.status === "damaged" || a.status === "needs-repair";

  // ไปหน้าแก้ไขทรัพย์สิน
  const handleEdit = (id: string) => {
    localStorage.setItem(KEYS.selectedAsset, id);
    router.push("/assets/edit");
  };

  const matchFilter = (a: Asset) => {
    if (filter === "lost") return lost.has(a.id);
    if (filter === "normal") return a.status === "normal" && !lost.has(a.id);
    if (filter === "issue") return isIssue(a);
    return true;
  };

  // ค้นหา + กรองข้อมูลทรัพย์สิน
  const filtered = assets.filter(
    (a) =>
      matchFilter(a) &&
      `${a.id} ${a.name} ${a.type} ${a.vendor} ${branchName(a.branchId)} ${statusText(a)}`
        .toLowerCase()
        .includes(search.toLowerCase())
  );

  const normalCount = assets.filter((a) => a.status === "normal" && !lost.has(a.id)).length;
  const problemCount = assets.filter(isIssue).length;
  const lostCount = assets.filter((a) => lost.has(a.id)).length;

  const chips: [Filter, string][] = [
    ["all", `ทั้งหมด (${assets.length})`],
    ["normal", `ปกติ (${normalCount})`],
    ["issue", `ชำรุด / ต้องซ่อม (${problemCount})`],
    ["lost", `สูญหาย (${lostCount})`],
  ];

  return (
    <div className="space-y-6">
      {/* ส่วนหัว */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">รายการทรัพย์สิน</h2>
          <p className="mt-1 text-sm text-slate-500">
            จัดการ ตรวจสอบ และติดตามข้อมูลทรัพย์สินทั้งหมดในระบบ
          </p>
        </div>

        <button
          onClick={() => router.push("/assets/add")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00786F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665F] hover:shadow-md active:scale-[0.98]"
        >
          <span className="text-lg leading-none">+</span>
          เพิ่มรายการทรัพย์สิน
        </button>
      </header>

      {/* กล่องสรุปข้อมูล */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="ทรัพย์สินทั้งหมด" value={assets.length} tag="รายการ"
          valueColor="text-slate-800" tagStyle="bg-teal-50 text-[#00786F]" />
        <Stat label="สถานะปกติ" value={normalCount} tag="พร้อมใช้งาน"
          valueColor="text-emerald-600" tagStyle="bg-emerald-50 text-emerald-700" />
        <Stat label="ชำรุด / ต้องซ่อม" value={problemCount} tag="ต้องตรวจสอบ"
          valueColor="text-amber-600" tagStyle="bg-amber-50 text-amber-700" />
        <Stat label="ทรัพย์สินสูญหาย" value={lostCount} tag="ไม่พบจากการนับ"
          valueColor="text-red-600" tagStyle="bg-red-50 text-red-700" />
      </div>

      {/* ตารางทรัพย์สิน */}
      <Card>
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">ข้อมูลทรัพย์สิน</h2>
              <p className="mt-1 text-sm text-slate-500">รายการทรัพย์สินที่บันทึกไว้ในระบบ</p>
            </div>

            <div className="relative w-full max-w-sm">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">⌕</span>
              <input
                type="text"
                placeholder="ค้นหารหัส ชื่อ หรือประเภท..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-4 focus:ring-teal-50"
              />
            </div>
          </div>

          {/* ตัวกรองสถานะ */}
          <div className="flex flex-wrap gap-2">
            {chips.map(([id, label]) => (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  filter === id
                    ? "bg-[#00786F] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* จำนวนรายการ */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <p className="text-sm text-slate-500">
              พบข้อมูล{" "}
              <span className="font-semibold text-[#00786F]">{filtered.length}</span>{" "}
              จาก {assets.length} รายการ
            </p>
            {(search || filter !== "all") && (
              <button
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="text-sm font-medium text-[#00786F] hover:underline"
              >
                ล้างการค้นหา
              </button>
            )}
          </div>

          {/* ตาราง */}
          <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  {["รหัสทรัพย์สิน", "ชื่อทรัพย์สิน", "ประเภท", "ผู้จำหน่าย", "สาขา", "มูลค่าคงเหลือ"].map((h) => (
                    <th key={h} className="whitespace-nowrap px-5 py-4 font-semibold">{h}</th>
                  ))}
                  <th className="whitespace-nowrap px-5 py-4 text-center font-semibold">สถานะ</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {filtered.length > 0 ? (
                  filtered.map((a) => {
                    const isLost = lost.has(a.id);
                    return (
                      <tr
                        key={a.id}
                        className={`transition hover:bg-teal-50/40 ${isLost ? "bg-red-50/30" : ""}`}
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <button
                            onClick={() => handleEdit(a.id)}
                            className="font-semibold text-[#00786F] transition hover:text-[#00665F] hover:underline"
                          >
                            {a.id}
                          </button>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-800">{a.name}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{a.type}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{a.vendor}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{branchName(a.branchId)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">{baht(currentDate ? remainingValue(a, currentDate) : a.price)}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-center">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${
                              isLost ? LOST_STYLE : STATUS_STYLE[a.status]
                            }`}
                          >
                            {statusText(a)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-3xl text-slate-300">⌕</span>
                        <p className="font-medium text-slate-600">ไม่พบข้อมูลทรัพย์สิน</p>
                        <p className="text-sm text-slate-400">ลองเปลี่ยนคำค้นหาหรือตัวกรองแล้วค้นหาอีกครั้ง</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400">
            * คลิกรหัสทรัพย์สินเพื่อดูรายละเอียดหรือแก้ไขข้อมูล · &quot;สูญหาย&quot; คือรายการที่ผลตรวจนับล่าสุดเป็น &quot;ไม่พบ&quot;
          </p>
        </div>
      </Card>
    </div>
  );
}
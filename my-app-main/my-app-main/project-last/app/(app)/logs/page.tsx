
"use client";

import { useState } from "react";
import { useAppData } from "@/lib/storage";

export default function Page() {
  const { logs } = useAppData();

  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [date, setDate] = useState("");

  const filteredLogs = logs.filter((log) => {
    const matchKeyword =
      log.who.toLowerCase().includes(keyword.toLowerCase()) ||
      log.action.toLowerCase().includes(keyword.toLowerCase());

    const matchCategory =
      category === "ทั้งหมด" || log.action.includes(category);

    const matchDate = date === "" || log.at.startsWith(date);

    return matchKeyword && matchCategory && matchDate;
  });

  const totalDays = new Set(
    logs.map((log) => log.at.slice(0, 10))
  ).size;

  const totalUsers = new Set(
    logs.map((log) => log.who)
  ).size;

  return (
    <div>

      {/* Header */}
      <header className="border-b border-slate-200 bg-white px-4 py-5 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">
            ประวัติการใช้งาน
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            ตรวจสอบประวัติและติดตามกิจกรรมต่าง ๆ ภายในระบบ
          </p>
        </div>
      </header>

      <main className="p-4 sm:p-6 lg:p-8">

        {/* Summary Cards */}
        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* Total Activities */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  กิจกรรมทั้งหมด
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {logs.length}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  รายการกิจกรรมในระบบ
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-[#00786F]">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M8 7h8M8 12h8M8 17h5M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Days */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  วันที่มีกิจกรรม
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {totalDays}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  จำนวนวันที่มีการบันทึกกิจกรรม
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Role ที่มีกิจกรรม
                </p>

                <h2 className="mt-2 text-3xl font-bold text-slate-800">
                  {totalUsers}
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  จำนวนผู้ใช้งานที่มีกิจกรรม
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2m16-13a4 4 0 010 8m4 5v-2a4 4 0 00-3-3.87M9 11a4 4 0 100-8 4 4 0 000 8z"
                  />
                </svg>
              </div>
            </div>
          </div>

        </section>

        {/* Activity History */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {/* Section Header */}
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <h2 className="text-lg font-bold text-slate-800">
              รายการกิจกรรม
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              ค้นหาและตรวจสอบประวัติการดำเนินงานของผู้ใช้งาน
            </p>
          </div>

          <div className="p-4 sm:p-6">

            {/* Search Filters */}
            <div className="mb-6">

              <h3 className="mb-3 text-sm font-semibold text-slate-700">
                ค้นหาประวัติ
              </h3>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

                {/* Keyword */}
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="7"
                      strokeWidth="1.8"
                    />
                    <path
                      strokeLinecap="round"
                      strokeWidth="1.8"
                      d="m16 16 4 4"
                    />
                  </svg>

                  <input
                    type="text"
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="ค้นหา Role หรือกิจกรรม"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* Category */}
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#00786F] focus:ring-2 focus:ring-teal-100"
                >
                  <option value="ทั้งหมด">ประเภทกิจกรรมทั้งหมด</option>
                  <option value="เพิ่ม">เพิ่ม</option>
                  <option value="แก้ไข">แก้ไข</option>
                  <option value="ลบ">ลบ</option>
                  <option value="ย้าย">ย้าย</option>
                  <option value="อนุมัติ">อนุมัติ</option>
                </select>

                {/* Date */}
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  aria-label="เลือกวัน"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#00786F] focus:ring-2 focus:ring-teal-100"
                />

              </div>

              {/* Filter Info */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  พบ{" "}
                  <span className="font-semibold text-[#00786F]">
                    {filteredLogs.length}
                  </span>{" "}
                  รายการ
                </p>

                {(keyword || category !== "ทั้งหมด" || date) && (
                  <button
                    onClick={() => {
                      setKeyword("");
                      setCategory("ทั้งหมด");
                      setDate("");
                    }}
                    className="text-sm font-medium text-[#00786F] transition hover:text-[#00665F]"
                  >
                    ล้างตัวกรอง
                  </button>
                )}
              </div>
            </div>

            {/* Activity Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">

                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="rounded-l-xl px-5 py-4">
                      Role ผู้ใช้งาน
                    </th>

                    <th className="px-5 py-4">
                      กิจกรรม
                    </th>

                    <th className="rounded-r-xl px-5 py-4">
                      วันและเวลา
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log, index) => (
                      <tr
                        key={`${log.at}-${index}`}
                        className="border-b border-slate-100 transition-colors hover:bg-slate-50/80"
                      >
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-50 text-xs font-bold text-[#00786F]">
                              {log.who.slice(0, 1)}
                            </span>

                            {log.who}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-700">
                          {log.action}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                          {new Date(log.at).toLocaleString("th-TH")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-16 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.8"
                              d="M8 7h8M8 12h8M8 17h5M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
                            />
                          </svg>
                        </div>

                        <p className="text-sm font-medium text-slate-600">
                          ไม่พบประวัติการใช้งาน
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          ลองเปลี่ยนคำค้นหา หรือตัวกรองที่เลือก
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>

              </table>
            </div>

            {/* Footer */}
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-400">
                แสดง {filteredLogs.length} จาก {logs.length} กิจกรรมทั้งหมด
              </p>
            </div>

          </div>
        </section>
      </main>
    </div>
  );
}

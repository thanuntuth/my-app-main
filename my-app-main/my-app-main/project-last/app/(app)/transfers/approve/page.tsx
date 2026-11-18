
"use client";

import { useState } from "react";
import { STATUS_LABEL } from "@/lib/labels";
import { useAppData } from "@/lib/storage";
import type { AssetStatus, Movement } from "@/lib/types";

// สถานะคำขอย้าย
type ApprovalStatus =
  | "รออนุมัติ"
  | "อนุมัติแล้ว"
  | "ไม่อนุมัติ";

// ชื่อแท็บ
type ViewTab =
  | "ทรัพย์สินทั้งหมด"
  | ApprovalStatus
  | "ทั้งหมด"
  | "ประวัติการย้ายทรัพย์สิน";

const tabs: ViewTab[] = [
  "ทรัพย์สินทั้งหมด",
  "รออนุมัติ",
  "อนุมัติแล้ว",
  "ไม่อนุมัติ",
  "ประวัติการย้ายทรัพย์สิน",
];

const ASSET_STATUS_STYLE: Record<AssetStatus, string> = {
  normal: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  damaged: "bg-red-50 text-red-700 ring-1 ring-red-200",
  "needs-repair": "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  "in-transit": "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

// แปลงวันที่
function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("th-TH");
}

export default function ApproveTransfersPage() {

  // ดึงข้อมูลจากระบบกลาง
  const {
    assets,
    setAssets,
    branches,
    moves,
    setMoves,
    log,
  } = useAppData();

  // เก็บคำค้นหา
  const [keyword, setKeyword] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("all");

  // เก็บแท็บที่เลือก
  const [tab, setTab] = useState<ViewTab>("ทรัพย์สินทั้งหมด");

  // อ่านสถานะของคำขอย้าย
  function getStatus(move: Movement): ApprovalStatus {
    return move.approvalStatus ?? "รออนุมัติ";
  }

  // นับจำนวนคำขอแต่ละสถานะ
  const waiting = moves.filter(
    (move) => getStatus(move) === "รออนุมัติ"
  ).length;

  const approved = moves.filter(
    (move) => getStatus(move) === "อนุมัติแล้ว"
  ).length;

  const rejected = moves.filter(
    (move) => getStatus(move) === "ไม่อนุมัติ"
  ).length;

  // หาชื่อสาขาจากรหัสสาขา
  function getBranchName(id: string) {
    const branch = branches.find(
      (item) => item.id === id || item.name === id
    );

    return branch?.name ?? id;
  }

  // ค้นหาทรัพย์สิน
  const filteredAssets = assets.filter((asset) => {
    const search = keyword.trim().toLowerCase();

    return (
      (selectedBranch === "all" || asset.branchId === selectedBranch) &&
      (asset.id.toLowerCase().includes(search) ||
        asset.name.toLowerCase().includes(search) ||
        getBranchName(asset.branchId).toLowerCase().includes(search))
    );
  });

  // ค้นหาคำขอย้าย
  const filteredMoves = moves.filter((move) => {
    const asset = assets.find(
      (item) => item.id === move.assetId
    );

    const searchText = [
      move.id,
      move.assetId,
      asset?.name ?? "",
      move.from,
      move.to,
    ].join(" ").toLowerCase();

    const matchesSearch = searchText.includes(keyword.trim().toLowerCase());
    const matchesBranch =
      selectedBranch === "all" ||
      move.from === selectedBranch ||
      move.to === selectedBranch;

    const status = getStatus(move);

    // แสดงตามแท็บที่เลือก
    const matchesTab =
      tab === "ทั้งหมด" ||
      tab === "ประวัติการย้ายทรัพย์สิน" ||
      tab === "ทรัพย์สินทั้งหมด" ||
      status === tab;

    return matchesSearch && matchesBranch && matchesTab;
  });

  const tabLabels: Record<ViewTab, string> = {
    "ทรัพย์สินทั้งหมด": `ทรัพย์สินทั้งหมด (${assets.length})`,
    "รออนุมัติ": `รออนุมัติ (${waiting})`,
    "อนุมัติแล้ว": `อนุมัติแล้ว (${approved})`,
    "ไม่อนุมัติ": `ไม่อนุมัติ (${rejected})`,
    ทั้งหมด: `ทั้งหมด (${moves.length})`,
    "ประวัติการย้ายทรัพย์สิน": `ประวัติการย้ายทรัพย์สิน (${moves.length})`,
  };

  // เปลี่ยนสถานะการอนุมัติ
  function updateApproval(
    move: Movement,
    status: ApprovalStatus
  ) {
    if (getStatus(move) !== "รออนุมัติ") return;

    // อัปเดตสถานะคำขอย้าย
    setMoves((previous) =>
      previous.map((item) =>
        item.id === move.id
          ? { ...item, approvalStatus: status }
          : item
      )
    );

    // เมื่ออนุมัติ ให้ส่งทรัพย์สินไปยังสาขาปลายทางเพื่อรอยืนยันรับ
    if (status === "อนุมัติแล้ว") {
      setAssets((previous) =>
        previous.map((asset) =>
          asset.id === move.assetId
            ? {
                ...asset,
                branchId: move.to,
                status: "in-transit",
                received: false,
              }
            : asset
        )
      );
    }

    // บันทึกประวัติ
    log(
      "Super admin",
      `${status}คำขอย้ายทรัพย์สิน ${move.assetId} (${move.id})`
    );
  }

  // สีของสถานะ
  function getStatusColor(status: ApprovalStatus) {
    if (status === "รออนุมัติ") {
      return "bg-amber-50 text-amber-700";
    }

    if (status === "อนุมัติแล้ว") {
      return "bg-emerald-50 text-emerald-700";
    }

    return "bg-red-50 text-red-700";
  }

  return (
    <div>
      {/* หัวข้อหน้า */}
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-bold text-slate-800">
          อนุมัติการย้ายทรัพย์สิน
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          ตรวจสอบทรัพย์สินและจัดการคำขอย้ายจากสาขา
        </p>
      </header>

      <main className="p-6">

        {/* สรุปจำนวนคำขอ */}
        <section className="mb-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">รออนุมัติ</p>
            <h2 className="mt-2 text-3xl font-bold text-amber-600">
              {waiting}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">อนุมัติแล้ว</p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-600">
              {approved}
            </h2>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">ไม่อนุมัติ</p>
            <h2 className="mt-2 text-3xl font-bold text-red-600">
              {rejected}
            </h2>
          </div>

        </section>

        {/* ตารางข้อมูล */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          <div className="border-b p-5">
            <h2 className="text-lg font-bold text-slate-800">
              จัดการทรัพย์สินและคำขอย้าย
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              ตรวจสอบข้อมูลทรัพย์สินและคำขอย้าย
            </p>
          </div>

          <div className="p-5">

            {/* แถบแท็บ */}
            <div className="mb-6 flex gap-6 overflow-x-auto border-b">

              {tabs.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setTab(item);
                    setKeyword("");
                  }}
                  className={`whitespace-nowrap border-b-2 pb-3 text-sm font-semibold ${
                    tab === item
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500"
                  }`}
                >
                  {tabLabels[item]}
                </button>
              ))}

            </div>

            {/* ช่องค้นหา */}
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder={
                  tab === "ทรัพย์สินทั้งหมด"
                    ? "ค้นหารหัสหรือชื่อทรัพย์สิน"
                    : "ค้นหารหัสคำขอหรือชื่อทรัพย์สิน"
                }
                className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
              />

              <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
                เลือกสาขา
                <select
                  value={selectedBranch}
                  onChange={(event) => setSelectedBranch(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-50"
                >
                  <option value="all">ทุกสาขา</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </label>

              <p className="text-sm text-slate-500">
                {tab === "ทรัพย์สินทั้งหมด"
                  ? `ทั้งหมด ${filteredAssets.length} รายการ`
                  : `ทั้งหมด ${filteredMoves.length} รายการ`}
              </p>

            </div>

            {/* ตารางทรัพย์สิน */}
            {tab === "ทรัพย์สินทั้งหมด" ? (

              <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[850px] border-collapse text-left text-sm">

                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">รหัสทรัพย์สิน</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">ชื่อทรัพย์สิน</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">ประเภท</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">ผู้จำหน่าย</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">สาขา</th>
                      <th className="whitespace-nowrap px-5 py-4 text-center font-semibold">สถานะ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredAssets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="transition hover:bg-blue-50/40"
                      >
                        <td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-600">
                          {asset.id}
                        </td>

                        <td className="px-5 py-4 font-medium text-slate-800">
                          {asset.name}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {asset.type}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {asset.vendor}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {getBranchName(asset.branchId)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-center">
                          <span className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${ASSET_STATUS_STYLE[asset.status]}`}>
                            {STATUS_LABEL[asset.status]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>

            ) : (

              /* ตารางคำขอย้าย */
              <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[900px] text-left text-sm">

                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">รหัสคำขอ</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">รหัสทรัพย์สิน</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">ชื่อทรัพย์สิน</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">จากสาขา</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">ไปยังสาขา</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">วันที่</th>
                      <th className="whitespace-nowrap px-5 py-4 font-semibold">สถานะ</th>
                      <th className="whitespace-nowrap px-5 py-4 text-center font-semibold">จัดการ</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredMoves.map((move) => {
                      const asset = assets.find(
                        (item) => item.id === move.assetId
                      );

                      const status = getStatus(move);

                      return (
                        <tr key={move.id} className="transition hover:bg-blue-50/40">

                          <td className="whitespace-nowrap px-5 py-4 font-semibold text-blue-600">
                            {move.id}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            {move.assetId}
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-800">
                            {asset?.name ?? "-"}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {getBranchName(move.from)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {getBranchName(move.to)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                            {formatDate(move.date)}
                          </td>

                          <td className="whitespace-nowrap px-5 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(status)}`}>
                              {status}
                            </span>
                          </td>

                          <td className="whitespace-nowrap px-5 py-4 text-center">

                            {status === "รออนุมัติ" ? (
                              <div className="flex justify-center gap-2">

                                <button
                                  onClick={() =>
                                    updateApproval(move, "อนุมัติแล้ว")
                                  }
                                  className="rounded-lg bg-[#00877E] px-3 py-2 text-xs text-white transition hover:bg-[#00786F]"
                                >
                                  อนุมัติ
                                </button>

                                <button
                                  onClick={() =>
                                    updateApproval(move, "ไม่อนุมัติ")
                                  }
                                  className="rounded-lg border border-red-200 px-3 py-2 text-xs text-red-600"
                                >
                                  ไม่อนุมัติ
                                </button>

                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">
                                ดำเนินการแล้ว
                              </span>
                            )}

                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                </table>
              </div>

            )}

            {/* ไม่พบข้อมูล */}
            {(
              tab === "ทรัพย์สินทั้งหมด"
                ? filteredAssets.length === 0
                : filteredMoves.length === 0
            ) && (
              <div className="py-12 text-center text-sm text-slate-400">
                ไม่พบข้อมูล
              </div>
            )}

          </div>
        </section>
      </main>
    </div>
  );
}

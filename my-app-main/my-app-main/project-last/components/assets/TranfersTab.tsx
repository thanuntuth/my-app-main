"use client";

import { useState } from "react";

import { Button } from "@/components/ui";
import { today } from "@/lib/depreciation";
import { useAppData } from "@/lib/storage";
import type { Movement } from "@/lib/types";
import { INPUT, LABEL, Notice, Panel, ROW, TABLE_WRAP, TBODY, TD, TH, THEAD } from "./parts";

export default function TransfersTab() {
  const { assets, branches, moves, setMoves, round, log } = useAppData();

  const [assetId, setAssetId] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState(today());

  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  const assetName = (id: string) => assets.find((a) => a.id === id)?.name ?? "";

  const pendingAssetIds = new Set(
    moves
      .filter((move) => (move.approvalStatus ?? "รออนุมัติ") === "รออนุมัติ")
      .map((move) => move.assetId),
  );
  const movable = assets.filter(
    (item) => item.received && !pendingAssetIds.has(item.id),
  );
  const asset = assets.find((a) => a.id === assetId);
  const destinations = branches.filter((b) => b.id !== asset?.branchId);
  const counting = round?.status === "open"; // กำลังตรวจนับอยู่

  const submit = () => {
    if (!asset || !to) return;
    const nextId =
      moves.reduce((max, move) => {
        const number = Number(move.id.match(/\d+$/)?.[0] ?? 0);
        return Math.max(max, number);
      }, 0) + 1;
    const m: Movement = {
      id: `MV-${String(nextId).padStart(4, "0")}`,
      assetId: asset.id,
      from: asset.branchId,
      to,
      date,
      approvalStatus: "รออนุมัติ",
      requester: localStorage.getItem("currentUser") ?? "Admin",
    };
    setMoves((previous) => [m, ...previous]);
    log(
      "Admin",
      `ส่งคำขอย้ายทรัพย์สิน ${asset.id} จาก ${branchName(asset.branchId)} ไป ${branchName(to)}`,
    );
    setAssetId("");
    setTo("");
    setDate(today());
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-bold text-slate-800">การย้ายทรัพย์สิน</h2>
        <p className="mt-1 text-sm text-slate-500">
          ส่งคำขอย้ายทรัพย์สินให้ Super Admin พิจารณาอนุมัติ
        </p>
      </header>

      <Panel title="ส่งคำขอย้ายทรัพย์สิน" subtitle="ทรัพย์สินจะเปลี่ยนสาขาหลัง Super Admin อนุมัติ">
          <div className="space-y-4">
            {counting && (
              <Notice title="ตอนนี้สาขากำลังตรวจนับ">
                การย้ายทรัพย์สินตอนนี้อาจทำให้รายการไม่ตรงกับที่สาขานับ
              </Notice>
            )}

            <div className="flex flex-wrap items-end gap-4">
              <label className="block">
                <span className={LABEL}>ทรัพย์สิน</span>
                <select
                  className={`${INPUT} w-72`}
                  value={assetId}
                  onChange={(e) => {
                    setAssetId(e.target.value);
                    setTo("");
                  }}
                >
                  <option value="">เลือกทรัพย์สิน</option>
                  {movable.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.id} {a.name} ({branchName(a.branchId)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={LABEL}>ย้ายไป</span>
                <select
                  className={`${INPUT} w-56`}
                  value={to}
                  disabled={!asset}
                  onChange={(e) => setTo(e.target.value)}
                >
                  <option value="">เลือกสาขาปลายทาง</option>
                  {destinations.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className={LABEL}>วันที่ย้าย</span>
                <input
                  type="date"
                  className={INPUT}
                  value={date}
                  max={today()}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <Button disabled={!asset || !to || !date} onClick={submit}>
                ส่งคำขอย้าย
              </Button>
            </div>
          </div>
      </Panel>

      <Panel title="ประวัติการย้าย" subtitle={`ทั้งหมด ${moves.length} รายการ`}>
        {moves.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีการย้ายทรัพย์สิน</p>
        ) : (
          <div className={TABLE_WRAP}>
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className={THEAD}>
                  <th className={TH}>เลขที่</th>
                  <th className={TH}>วันที่</th>
                  <th className={TH}>ทรัพย์สิน</th>
                  <th className={TH}>จากสาขา</th>
                  <th className={TH}>ไปสาขา</th>
                  <th className={TH}>สถานะ</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {moves.map((m) => (
                  <tr key={m.id} className={ROW}>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#00786F]">{m.id}</td>
                    <td className={TD}>{m.date}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{m.assetId} {assetName(m.assetId)}</td>
                    <td className={TD}>{branchName(m.from)}</td>
                    <td className={TD}>{branchName(m.to)}</td>
                    <td className={TD}>{m.approvalStatus ?? "รออนุมัติ"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
"use client";

import { useState } from "react";

import { Badge, Button } from "@/components/ui";
import { baht, today } from "@/lib/depreciation";
import { STATUS_LABEL } from "@/lib/labels";
import { useAppData } from "@/lib/storage";
import type { Asset, Repair } from "@/lib/types";
import { INPUT, Panel, ROW, Stat, TABLE_WRAP, TBODY, TD, TH, THEAD } from "./parts";

function QueueRow({
  asset,
  branch,
  onSend,
}: {
  asset: Asset;
  branch: string;
  onSend: (vendor: string, note: string) => void;
}) {
  const [vendor, setVendor] = useState(asset.vendor); // ตั้งต้นเป็นผู้ขายเดิม
  const [note, setNote] = useState("");
  const inWarranty = !!asset.warrantyUntil && asset.warrantyUntil >= today();

  return (
    <tr className={ROW}>
      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#00786F]">{asset.id}</td>
      <td className="px-5 py-4 font-medium text-slate-800">{asset.name}</td>
      <td className={TD}>{branch}</td>
      <td className="px-5 py-4"><Badge tone="amber">{STATUS_LABEL[asset.status]}</Badge></td>
      <td className="px-5 py-4">
        {inWarranty ? <Badge tone="green">อยู่ในประกัน</Badge> : <Badge>หมดประกัน</Badge>}
      </td>
      <td className="px-5 py-4">
        <input className={`${INPUT} w-44`} value={vendor} onChange={(e) => setVendor(e.target.value)} />
      </td>
      <td className="px-5 py-4">
        <input
          className={`${INPUT} w-56`}
          placeholder="อาการ / หมายเหตุ"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </td>
      <td className="px-5 py-4 text-right">
        <Button size="sm" disabled={!vendor.trim()} onClick={() => onSend(vendor.trim(), note.trim())}>
          ส่งซ่อม
        </Button>
      </td>
    </tr>
  );
}

function OpenRow({
  repair,
  name,
  onDone,
}: {
  repair: Repair;
  name: string;
  onDone: (cost: number) => void;
}) {
  const [cost, setCost] = useState(0);

  return (
    <tr className={ROW}>
      <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#00786F]">{repair.id}</td>
      <td className="px-5 py-4 font-medium text-slate-800">{repair.assetId} {name}</td>
      <td className={TD}>{repair.vendor}</td>
      <td className={TD}>{repair.sentDate}</td>
      <td className={TD}>{repair.note ?? "-"}</td>
      <td className="px-5 py-4">
        <input
          type="number"
          min={0}
          className={`${INPUT} w-32`}
          value={cost}
          onChange={(e) => setCost(Number(e.target.value))}
        />
      </td>
      <td className="px-5 py-4 text-right">
        <Button size="sm" onClick={() => onDone(cost)}>ซ่อมเสร็จ</Button>
      </td>
    </tr>
  );
}

export default function RepairsTab() {
  const { assets, setAssets, branches, repairs, setRepairs, log } = useAppData();

  const open = repairs.filter((r) => r.status === "in-repair");
  const done = repairs.filter((r) => r.status === "done");
  const openIds = new Set(open.map((r) => r.assetId));
  // คิวรอส่งซ่อม = ชำรุด/ต้องซ่อม และยังไม่มีงานซ่อมที่เปิดอยู่
  const queue = assets.filter(
    (a) => (a.status === "damaged" || a.status === "needs-repair") && !openIds.has(a.id)
  );
  const totalCost = done.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const nameOf = (id: string) => assets.find((a) => a.id === id)?.name ?? "";
  const branchOf = (a: Asset) => branches.find((b) => b.id === a.branchId)?.name ?? a.branchId;

  const send = (a: Asset, vendor: string, note: string) => {
    const r: Repair = {
      id: `RPR-${String(repairs.length + 1).padStart(4, "0")}`,
      assetId: a.id,
      sentDate: today(),
      vendor,
      note: note || undefined,
      status: "in-repair",
    };
    setRepairs([r, ...repairs]);
    log("Admin", `ส่งซ่อม ${a.id} ที่ ${vendor}`);
  };

  const finish = (r: Repair, cost: number) => {
    setRepairs(
      repairs.map((x) => (x.id === r.id ? { ...x, status: "done" as const, doneDate: today(), cost } : x))
    );
    setAssets(assets.map((a) => (a.id === r.assetId ? { ...a, status: "normal" as const } : a)));
    log("Admin", `ซ่อมเสร็จ ${r.assetId} (${r.id})`);
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-lg font-bold text-slate-800">งานซ่อม</h2>
        <p className="mt-1 text-sm text-slate-500">
          ติดตามทรัพย์สินที่ชำรุด ตั้งแต่ส่งซ่อมจนซ่อมเสร็จ
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat label="รอส่งซ่อม" value={queue.length} tag="รอดำเนินการ"
          valueColor="text-amber-600" tagStyle="bg-amber-50 text-amber-700" />
        <Stat label="กำลังซ่อม" value={open.length} tag="อยู่ที่ร้านซ่อม"
          valueColor="text-blue-600" tagStyle="bg-blue-50 text-blue-700" />
        <Stat label="ซ่อมเสร็จ" value={done.length} tag="งาน"
          valueColor="text-emerald-600" tagStyle="bg-emerald-50 text-emerald-700" />
        <Stat label="ค่าซ่อมสะสม" value={totalCost} tag="บาท"
          valueColor="text-slate-800" tagStyle="bg-teal-50 text-[#00786F]" />
      </div>

      <Panel title="รอส่งซ่อม" subtitle="ทรัพย์สินที่ชำรุดหรือต้องซ่อม และยังไม่ได้ส่งซ่อม">
        {queue.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">ไม่มีทรัพย์สินที่รอส่งซ่อม</p>
        ) : (
          <div className={TABLE_WRAP}>
            <table className="w-full min-w-[1000px] border-collapse text-left text-sm">
              <thead>
                <tr className={THEAD}>
                  <th className={TH}>รหัส</th>
                  <th className={TH}>ชื่อทรัพย์สิน</th>
                  <th className={TH}>สาขา</th>
                  <th className={TH}>สถานะ</th>
                  <th className={TH}>ประกัน</th>
                  <th className={TH}>ส่งซ่อมที่</th>
                  <th className={TH}>หมายเหตุ</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {queue.map((a) => (
                  <QueueRow key={a.id} asset={a} branch={branchOf(a)} onSend={(v, n) => send(a, v, n)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="กำลังซ่อม" subtitle="กรอกค่าซ่อมแล้วกด “ซ่อมเสร็จ” สถานะทรัพย์สินจะกลับเป็นปกติ">
        {open.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">ไม่มีงานที่กำลังซ่อม</p>
        ) : (
          <div className={TABLE_WRAP}>
            <table className="w-full min-w-[900px] border-collapse text-left text-sm">
              <thead>
                <tr className={THEAD}>
                  <th className={TH}>เลขงาน</th>
                  <th className={TH}>ทรัพย์สิน</th>
                  <th className={TH}>ร้านซ่อม</th>
                  <th className={TH}>วันที่ส่ง</th>
                  <th className={TH}>หมายเหตุ</th>
                  <th className={TH}>ค่าซ่อม (บาท)</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {open.map((r) => (
                  <OpenRow key={r.id} repair={r} name={nameOf(r.assetId)} onDone={(c) => finish(r, c)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="ประวัติงานซ่อม" subtitle={`ซ่อมเสร็จแล้ว ${done.length} งาน`}>
        {done.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">ยังไม่มีงานที่ซ่อมเสร็จ</p>
        ) : (
          <div className={TABLE_WRAP}>
            <table className="w-full min-w-[800px] border-collapse text-left text-sm">
              <thead>
                <tr className={THEAD}>
                  <th className={TH}>เลขงาน</th>
                  <th className={TH}>ทรัพย์สิน</th>
                  <th className={TH}>ร้านซ่อม</th>
                  <th className={TH}>วันที่ส่ง</th>
                  <th className={TH}>วันที่เสร็จ</th>
                  <th className={TH}>ค่าซ่อม</th>
                </tr>
              </thead>
              <tbody className={TBODY}>
                {done.map((r) => (
                  <tr key={r.id} className={ROW}>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold text-[#00786F]">{r.id}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{r.assetId} {nameOf(r.assetId)}</td>
                    <td className={TD}>{r.vendor}</td>
                    <td className={TD}>{r.sentDate}</td>
                    <td className={TD}>{r.doneDate}</td>
                    <td className={TD}>{baht(r.cost ?? 0)}</td>
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
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { Card, PageTitle } from "@/components/ui";
import { baht, remainingValue } from "@/lib/depreciation";
import { RESULT_LABEL, ROUND_LABEL, STATUS_LABEL } from "@/lib/labels";
import { useAppData } from "@/lib/storage";
import { STORE_BRANCH_ID } from "@/lib/utils";
import type {
  Asset,
  AssetStatus,
  Checklist,
  CountItemResult,
  CountRound,
} from "@/lib/types";

const STATUS_COLORS = {
  normal: "#00786F",
  damaged: "#DC5656",
  repair: "#E9A23B",
  transit: "#94A3B8",
  lost: "#9333EA",
};

type DrilldownConfig = {
  title: string;
  subtitle: string;
  href?: string;
  hrefLabel?: string;
  mode: "branches" | "assets";
  assets?: Asset[];
};

// แปลงวันที่เป็นรูปแบบไทย
function formatDate(value?: string) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("th-TH");
}

// การ์ดแสดงตัวเลขสรุป
function StatCard({
  title,
  value,
  color,
  tag,
  tagStyle,
  subText,
}: {
  title: string;
  value: number;
  color: string;
  tag: string;
  tagStyle: string;
  subText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        {subText && <span className="text-xs text-slate-400">{subText}</span>}
      </div>

      <div className="mt-3 flex items-end justify-between gap-2">
        <h3 className={`text-3xl font-bold ${color}`}>
          {value.toLocaleString("th-TH")}
        </h3>
        <span
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tagStyle}`}
        >
          {tag}
        </span>
      </div>
    </div>
  );
}

function CountStat({
  title,
  value,
  color,
  background,
  onClick,
}: {
  title: string;
  value: number;
  color: string;
  background: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border p-4 text-left transition hover:shadow-sm ${background}`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-600">{title}</p>
        <span className="text-[11px] text-slate-400">ดูรายการ →</span>
      </div>
      <p className={`mt-1.5 text-2xl font-bold ${color}`}>
        {value.toLocaleString("th-TH")}
      </p>
    </button>
  );
}

export default function Dashboard() {
  const { assets, branches, round, rounds, repairs, ready } = useAppData();
  const [selectedView, setSelectedView] = useState<DrilldownConfig | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    setToday(new Date());
  }, []);

  const safeAssets = useMemo(() => (Array.isArray(assets) ? assets : []), [assets]);
  const safeBranches = useMemo(() => (Array.isArray(branches) ? branches : []), [branches]);
  const safeRounds = useMemo(() => (Array.isArray(rounds) ? rounds : []), [rounds]);
  const safeRepairs = useMemo(() => (Array.isArray(repairs) ? repairs : []), [repairs]);

  // 1. ค้นหาสาขาที่มีในระบบ (ตัดคลังกลาง/บริษัทแม่ออก)
  const realBranches = useMemo(() => {
    const valid = safeBranches.filter(
      (b) =>
        (b.id as string) !== "hq" &&
        !b.name.includes("บริษัทแม่") &&
        !b.name.includes("คลังกลาง")
    );
    if (valid.length > 0) return valid;

    const assetBranchIds = Array.from(
      new Set(
        safeAssets
          .map((a) => a.branchId as string | undefined)
          .filter((id): id is string => Boolean(id) && id !== "hq")
      )
    );
    if (assetBranchIds.length > 0) {
      return assetBranchIds.map((id, idx) => ({
        id,
        name: idx === 0 ? "สาขา 1" : id,
      }));
    }

    return [{ id: STORE_BRANCH_ID, name: "สาขา 1" }];
  }, [safeBranches, safeAssets]);

  const branchCount = realBranches.length;
  const primaryBranchName = realBranches[0]?.name || "สาขา 1";
  const branchNamesText =
    realBranches.length > 0
      ? realBranches.map((b) => b.name).join(", ")
      : "สาขา 1";

  const getBranchLabel = (branchId?: string) => {
    if (!branchId) return "-";
    if (branchId === "hq") return "คลังกลาง";
    return (
      realBranches.find((b) => b.id === branchId)?.name ??
      safeBranches.find((b) => b.id === branchId)?.name ??
      branchId
    );
  };

  // 2. รอบตรวจนับปัจจุบัน
  const activeRound: CountRound | null = useMemo(() => {
    if (round) return round;
    if (safeRounds.length > 0) {
      const openList = safeRounds
        .filter((r) => r.status !== "closed")
        .sort((a, b) => a.date.localeCompare(b.date));
      return (
        openList[0] ??
        [...safeRounds].sort((a, b) => b.date.localeCompare(a.date))[0] ??
        null
      );
    }
    return null;
  }, [round, safeRounds]);

  // 3. รวมผลตรวจนับจากรอบปัจจุบันและรอบทั้งหมด
  const roundResults: Record<string, CountItemResult> = useMemo(() => {
    const merged: Record<string, CountItemResult> = {};
    [...safeRounds]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((r) => {
        Object.entries(r.results ?? {}).forEach(([id, res]) => {
          merged[id] = res;
        });
      });
    Object.entries(activeRound?.results ?? {}).forEach(([id, res]) => {
      merged[id] = res;
    });
    return merged;
  }, [safeRounds, activeRound]);

  // 4. แยกกลุ่มรายการทรัพย์สินแบบไม่ทับซ้อนกัน (เพื่อให้วงล้อแสดงสีม่วงครบ 100%)
  const lostAssetIds = useMemo(
    () =>
      new Set<string>([
        ...safeAssets
          .filter(
            (a) =>
              (a.status as string) === "disposed" ||
              (a.status as string) === "lost"
          )
          .map((a) => a.id),
        ...Object.entries(roundResults)
          .filter(([, r]) => r.result === "not-found")
          .map(([id]) => id),
      ]),
    [safeAssets, roundResults]
  );

  const lostList = useMemo(
    () => safeAssets.filter((a) => lostAssetIds.has(a.id)),
    [safeAssets, lostAssetIds]
  );
  const normalList = useMemo(
    () => safeAssets.filter((a) => !lostAssetIds.has(a.id) && a.status === "normal"),
    [safeAssets, lostAssetIds]
  );
  const damagedList = useMemo(
    () => safeAssets.filter((a) => !lostAssetIds.has(a.id) && a.status === "damaged"),
    [safeAssets, lostAssetIds]
  );
  const repairList = useMemo(
    () => safeAssets.filter((a) => !lostAssetIds.has(a.id) && a.status === "needs-repair"),
    [safeAssets, lostAssetIds]
  );
  const transitList = useMemo(
    () => safeAssets.filter((a) => !lostAssetIds.has(a.id) && a.status === "in-transit"),
    [safeAssets, lostAssetIds]
  );
  const needRepairList = useMemo(
    () => [...damagedList, ...repairList],
    [damagedList, repairList]
  );

  const totalAssets = safeAssets.length;
  const normalAssets = normalList.length;
  const damagedAssets = damagedList.length;
  const repairAssets = repairList.length;
  const transitAssets = transitList.length;
  const lostAssets = lostList.length;
  const needRepairTotal = needRepairList.length;

  // ใกล้หมดประกันภายใน 30 วัน
  const warrantyList = useMemo(() => {
    if (!today) return [];

    const now = new Date(today);
    now.setHours(0, 0, 0, 0);

    return safeAssets.filter((a) => {
      if (!a.warrantyUntil) return false;

      const days =
        (new Date(a.warrantyUntil + "T00:00:00").getTime() -
          now.getTime()) /
        86400000;

      return days >= 0 && days <= 30;
    });
  }, [safeAssets, today]);

  // 5. สรุปภาพรวมการตรวจนับจากรอบปัจจุบัน
  const currentRoundResults: Record<string, CountItemResult> =
    activeRound?.results ?? {};
  const countedIds = useMemo(
    () => new Set(Object.keys(currentRoundResults)),
    [currentRoundResults]
  );

  const rawChecklists: Checklist[] = activeRound?.checklists ?? [];
  const sentChecklists = rawChecklists.filter((c) => c.status === "sent");
  const allChecklists =
    sentChecklists.length > 0 ? sentChecklists : rawChecklists;
  const checklistAssetIds = useMemo(
    () => allChecklists.flatMap((c) => c.assetIds),
    [allChecklists]
  );

  const assignedAssetsList = useMemo(() => {
    if (!activeRound) return [];
    if (checklistAssetIds.length > 0) {
      const idSet = new Set(checklistAssetIds);
      return safeAssets.filter((a) => idSet.has(a.id));
    }
    return safeAssets.filter(
      (a) => (a.branchId as string) !== "hq" && a.status !== "in-transit"
    );
  }, [activeRound, checklistAssetIds, safeAssets]);

  const countedAssetsList = useMemo(
    () => safeAssets.filter((a) => countedIds.has(a.id)),
    [safeAssets, countedIds]
  );
  const pendingAssetsList = useMemo(
    () => assignedAssetsList.filter((a) => !countedIds.has(a.id)),
    [assignedAssetsList, countedIds]
  );
  const roundLostList = useMemo(
    () =>
      safeAssets.filter((a) => currentRoundResults[a.id]?.result === "not-found"),
    [safeAssets, currentRoundResults]
  );
  const roundDamagedList = useMemo(
    () =>
      safeAssets.filter((a) => {
        const res = currentRoundResults[a.id]?.result;
        return res === "damaged" || res === "needs-repair";
      }),
    [safeAssets, currentRoundResults]
  );

  const assignedCount = assignedAssetsList.length;
  const countedAssets = Object.keys(currentRoundResults).length;
  const pendingCount = pendingAssetsList.length;
  const roundLostAssets = roundLostList.length;
  const countDamaged = roundDamagedList.length;
  const progress =
    assignedCount > 0
      ? Math.min(Math.round((countedAssets / assignedCount) * 100), 100)
      : 0;

  // 6. รอบตรวจนับที่ยังไม่ปิด
  const activeRounds: CountRound[] = useMemo(() => {
    if (activeRound && activeRound.status !== "closed") {
      const others = safeRounds.filter(
        (r) => r.status !== "closed" && r.date !== activeRound.date
      );
      return [activeRound, ...others];
    }
    return safeRounds
      .filter((r) => r.status !== "closed")
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [safeRounds, activeRound]);

  const getBranchNames = (r: CountRound) => {
    const ids = r.checklists?.map((c: Checklist) => c.branchId) ?? [];
    if (ids.length === 0) return primaryBranchName;
    return ids.map((id) => getBranchLabel(id)).join(", ");
  };

  // 7. งานซ่อม
  const openRepairIds = useMemo(
    () =>
      new Set(
        safeRepairs.filter((r) => r.status === "in-repair").map((r) => r.assetId)
      ),
    [safeRepairs]
  );
  const activeRepairList = useMemo(
    () => safeAssets.filter((a) => openRepairIds.has(a.id)),
    [safeAssets, openRepairIds]
  );
  const waitingRepairList = useMemo(
    () =>
      safeAssets.filter(
        (a) =>
          (a.status === "damaged" || a.status === "needs-repair") &&
          !openRepairIds.has(a.id)
      ),
    [safeAssets, openRepairIds]
  );

  // 8. รายการที่รอดำเนินการ
  const tasks = [
    {
      name: "ไม่พบในการตรวจนับ",
      count: roundLostAssets,
      color: "bg-red-50 text-red-600",
      onClick: () =>
        setSelectedView({
          title: `ไม่พบในการตรวจนับ (${roundLostAssets} รายการ)`,
          subtitle: "รายการทรัพย์สินที่ตรวจนับแล้วไม่พบในสาขา",
          mode: "assets",
          assets: roundLostList,
        }),
    },
    {
      name: "ชำรุด/ต้องซ่อม รอส่งซ่อม",
      count: waitingRepairList.length,
      color: "bg-orange-50 text-orange-600",
      onClick: () =>
        setSelectedView({
          title: `ชำรุด/ต้องซ่อม รอส่งซ่อม (${waitingRepairList.length} รายการ)`,
          subtitle: "รายการที่พบว่าชำรุดหรือต้องซ่อมและยังไม่ได้ส่งเข้าคิวซ่อม",
          mode: "assets",
          assets: waitingRepairList,
        }),
    },
    {
      name: "กำลังซ่อม",
      count: activeRepairList.length,
      color: "bg-amber-50 text-amber-600",
      onClick: () =>
        setSelectedView({
          title: `กำลังซ่อม (${activeRepairList.length} รายการ)`,
          subtitle: "รายการทรัพย์สินที่อยู่ระหว่างดำเนินการซ่อม",
          mode: "assets",
          assets: activeRepairList,
        }),
    },
    {
      name: "ใกล้หมดประกัน (30 วัน)",
      count: warrantyList.length,
      color: "bg-purple-50 text-purple-600",
      onClick: () =>
        setSelectedView({
          title: `ใกล้หมดประกันภายใน 30 วัน (${warrantyList.length} รายการ)`,
          subtitle: "รายการทรัพย์สินที่ใกล้ครบกำหนดวันหมดประกัน",
          mode: "assets",
          assets: warrantyList,
        }),
    },
    {
      name: "รอสาขายืนยันรับ",
      count: transitAssets,
      color: "bg-slate-100 text-slate-600",
      onClick: () =>
        setSelectedView({
          title: `รอสาขายืนยันรับ (${transitAssets} รายการ)`,
          subtitle: "รายการทรัพย์สินที่อยู่ระหว่างจัดส่งไปยังสาขา",
          mode: "assets",
          assets: transitList,
        }),
    },
    {
      name: "รายการรอตรวจนับ",
      count: pendingCount,
      color: "bg-blue-50 text-blue-600",
      onClick: () =>
        setSelectedView({
          title: `รายการรอตรวจนับ (${pendingCount} รายการ)`,
          subtitle: "รายการทรัพย์สินในรอบปัจจุบันที่ยังไม่ได้บันทึกผลตรวจนับ",
          mode: "assets",
          assets: pendingAssetsList,
        }),
    },
  ].filter((item) => item.count > 0);

  // 9. การ์ดสรุปตัวเลขหลัก 5 ช่องด้านบน
  const cards = [
    {
      title: "สาขาทั้งหมด",
      value: branchCount,
      color: "text-slate-800",
      tag: "สาขา",
      tagStyle: "bg-blue-50 text-blue-700",
      subText: branchNamesText,
      onClick: () =>
        setSelectedView({
          title: `สาขาทั้งหมด (${branchCount} สาขา)`,
          subtitle: "รายชื่อสาขาที่มีในระบบและสรุปทรัพย์สินประจำสาขา",
          mode: "branches",
        }),
    },
    {
      title: "ทรัพย์สินทั้งหมด",
      value: totalAssets,
      color: "text-[#00786F]",
      tag: "รายการ",
      tagStyle: "bg-teal-50 text-[#00786F]",
      onClick: () =>
        setSelectedView({
          title: `ทรัพย์สินทั้งหมด (${totalAssets} รายการ)`,
          subtitle: "รายการทรัพย์สินทั้งหมดที่บันทึกอยู่ในระบบ",
          mode: "assets",
          assets: safeAssets,
        }),
    },
    {
      title: "กำลังจัดส่ง",
      value: transitAssets,
      color: "text-slate-700",
      tag: "รายการ",
      tagStyle: "bg-slate-100 text-slate-700",
      onClick: () =>
        setSelectedView({
          title: `กำลังจัดส่ง (${transitAssets} รายการ)`,
          subtitle: "รายการทรัพย์สินที่กำลังจัดส่งและรอสาขากดรับเข้า",
          mode: "assets",
          assets: transitList,
        }),
    },
    {
      title: "ต้องซ่อม / ชำรุด",
      value: needRepairTotal,
      color: "text-amber-600",
      tag: "รายการ",
      tagStyle: "bg-amber-50 text-amber-700",
      subText: `ชำรุด ${damagedAssets} · ซ่อม ${repairAssets}`,
      onClick: () =>
        setSelectedView({
          title: `ต้องซ่อม / ชำรุด (${needRepairTotal} รายการ)`,
          subtitle: `ชำรุด ${damagedAssets} รายการ · ต้องซ่อม ${repairAssets} รายการ`,
          mode: "assets",
          assets: needRepairList,
        }),
    },
    {
      title: "ทรัพย์สินสูญหาย",
      value: lostAssets,
      color: "text-red-600",
      tag: "รายการ",
      tagStyle: "bg-red-50 text-red-700",
      onClick: () =>
        setSelectedView({
          title: `ทรัพย์สินสูญหาย (${lostAssets} รายการ)`,
          subtitle: "รายการทรัพย์สินที่ตรวจนับไม่พบหรือสูญหาย",
          mode: "assets",
          assets: lostList,
        }),
    },
  ];

  // 10. สัดส่วนกราฟโดนัท (ผลรวมทุกสถานะ = 100% ของ totalAssets)
  const pct = (n: number) => (totalAssets > 0 ? (n / totalAssets) * 100 : 0);
  const normalEnd = pct(normalAssets);
  const damagedEnd = normalEnd + pct(damagedAssets);
  const repairEnd = damagedEnd + pct(repairAssets);
  const transitEnd = repairEnd + pct(transitAssets);

  const legendItems = [
    {
      name: "ปกติ",
      value: normalAssets,
      color: "bg-[#00786F]",
      list: normalList,
      subtitle: "ทรัพย์สินสถานะปกติพร้อมใช้งาน",
    },
    {
      name: "ชำรุด",
      value: damagedAssets,
      color: "bg-[#DC5656]",
      list: damagedList,
      subtitle: "ทรัพย์สินที่พบว่าชำรุด",
    },
    {
      name: "ต้องซ่อม",
      value: repairAssets,
      color: "bg-[#E9A23B]",
      list: repairList,
      subtitle: "ทรัพย์สินที่อยู่ในสถานะต้องซ่อม",
    },
    {
      name: "ระหว่างจัดส่ง",
      value: transitAssets,
      color: "bg-slate-400",
      list: transitList,
      subtitle: "ทรัพย์สินที่อยู่ระหว่างจัดส่งไปยังสาขา",
    },
    {
      name: "สูญหาย",
      value: lostAssets,
      color: "bg-purple-600",
      list: lostList,
      subtitle: "ทรัพย์สินที่ตรวจนับไม่พบหรือสูญหาย",
    },
  ];

  return (
    <main className="w-full space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      </header>

      {/* SUMMARY CARDS */}
      <section
        aria-label="สรุปภาพรวมทรัพย์สิน"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
      >
        {cards.map((item) => (
          <button
            key={item.title}
            type="button"
            onClick={item.onClick}
            className="block w-full rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-[#00786F]/60 hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">{item.title}</p>
              <span
                className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${item.tagStyle}`}
              >
                {item.tag}
              </span>
            </div>
            <p className={`mt-3 text-3xl font-bold ${item.color}`}>
              {ready === false ? "—" : item.value.toLocaleString("th-TH")}
            </p>
            {item.subText && (
              <p className="mt-1 truncate text-xs font-medium text-slate-500">
                {item.subText}
              </p>
            )}
          </button>
        ))}
      </section>

      {/* CHARTS */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* ASSET STATUS */}
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">
              ภาพรวมสถานะทรัพย์สิน
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              คลิกที่สถานะแต่ละรายการเพื่อดูรายละเอียดทรัพย์สิน
            </p>
          </div>

          <div className="flex flex-col items-center justify-around gap-6 sm:flex-row">
            <div
              className="flex h-48 w-48 shrink-0 items-center justify-center rounded-full shadow-inner"
              style={{
                background:
                  totalAssets > 0
                    ? `conic-gradient(
                        ${STATUS_COLORS.normal} 0% ${normalEnd}%,
                        ${STATUS_COLORS.damaged} ${normalEnd}% ${damagedEnd}%,
                        ${STATUS_COLORS.repair} ${damagedEnd}% ${repairEnd}%,
                        ${STATUS_COLORS.transit} ${repairEnd}% ${transitEnd}%,
                        ${STATUS_COLORS.lost} ${transitEnd}% 100%
                      )`
                    : "#E2E8F0",
              }}
            >
              <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full bg-white shadow-sm">
                <span className="text-3xl font-bold text-slate-800">
                  {totalAssets.toLocaleString("th-TH")}
                </span>
                <span className="mt-1 text-xs text-slate-500">
                  ทรัพย์สินทั้งหมด
                </span>
              </div>
            </div>

            <div className="w-full min-w-52 space-y-2 sm:w-auto">
              {legendItems.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    setSelectedView({
                      title: `สถานะ: ${item.name} (${item.value} รายการ)`,
                      subtitle: item.subtitle,
                      mode: "assets",
                      assets: item.list,
                    })
                  }
                  className="flex w-full items-center justify-between gap-5 rounded-lg px-2.5 py-1.5 text-left transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`h-3 w-3 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-base font-bold text-slate-800">
                    {item.value.toLocaleString("th-TH")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* COUNTING OVERVIEW */}
        <Card>
          <div className="mb-6 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                ภาพรวมการตรวจนับ
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {activeRound
                  ? `รอบวันที่ ${formatDate(activeRound.date)} (${ROUND_LABEL[activeRound.status]})`
                  : "ยังไม่มีรอบตรวจนับ"}
              </p>
            </div>

            <Link
              href="/branch-assets"
              className="text-xs font-semibold text-[#00786F] hover:underline"
            >
              ไปหน้าตรวจนับ →
            </Link>
          </div>

          <div className="mb-3 flex items-end justify-between">
            <span className="text-sm font-medium text-slate-500">
              ความคืบหน้าการตรวจนับ
            </span>
            <span className="text-2xl font-bold text-[#00786F]">
              {progress}%
            </span>
          </div>

          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#00786F] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <CountStat
              title="ตรวจนับแล้ว"
              value={countedAssets}
              color="text-[#00786F]"
              background="border-teal-100 bg-teal-50/60"
              onClick={() =>
                setSelectedView({
                  title: `ตรวจนับแล้ว (${countedAssets} รายการ)`,
                  subtitle: "รายการทรัพย์สินที่บันทึกผลตรวจนับในรอบนี้เรียบร้อยแล้ว",
                  mode: "assets",
                  assets: countedAssetsList,
                })
              }
            />
            <CountStat
              title="รอตรวจนับ"
              value={pendingCount}
              color="text-amber-600"
              background="border-amber-100 bg-amber-50/60"
              onClick={() =>
                setSelectedView({
                  title: `รอตรวจนับ (${pendingCount} รายการ)`,
                  subtitle: "รายการทรัพย์สินที่ยังไม่ได้ตรวจนับในรอบนี้",
                  mode: "assets",
                  assets: pendingAssetsList,
                })
              }
            />
            <CountStat
              title="ไม่พบทรัพย์สิน"
              value={roundLostAssets}
              color="text-red-600"
              background="border-red-100 bg-red-50/60"
              onClick={() =>
                setSelectedView({
                  title: `ไม่พบทรัพย์สินในการตรวจนับ (${roundLostAssets} รายการ)`,
                  subtitle: "รายการที่บันทึกผลตรวจนับว่าไม่พบ / สูญหาย",
                  mode: "assets",
                  assets: roundLostList,
                })
              }
            />
            <CountStat
              title="พบชำรุด / ต้องซ่อม"
              value={countDamaged}
              color="text-orange-600"
              background="border-orange-100 bg-orange-50/60"
              onClick={() =>
                setSelectedView({
                  title: `พบชำรุด / ต้องซ่อม (${countDamaged} รายการ)`,
                  subtitle: "รายการที่บันทึกผลตรวจนับว่าชำรุดหรือต้องซ่อม",
                  mode: "assets",
                  assets: roundDamagedList,
                })
              }
            />
          </div>
        </Card>
      </section>

      {/* ACTIVE ROUNDS & PENDING TASKS */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                รอบตรวจนับที่กำลังดำเนินการ
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                รายการรอบตรวจนับที่เปิดใช้งานอยู่ในขณะนี้
              </p>
            </div>
            <Link
              href="/branch-assets"
              className="whitespace-nowrap text-sm font-medium text-[#00786F] transition hover:text-[#00665F] hover:underline"
            >
              ไปหน้าจัดการสาขา
            </Link>
          </div>

          {activeRounds.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              ไม่มีรอบตรวจนับที่กำลังดำเนินการในขณะนี้
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {activeRounds.map((r, idx) => (
                <Link
                  key={`${r.date}-${idx}`}
                  href="/branch-assets"
                  className="block rounded-xl border border-slate-200 p-4 transition hover:border-teal-200 hover:bg-teal-50/40"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">
                        รอบตรวจนับวันที่ {formatDate(r.date)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {getBranchNames(r)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ${
                        r.status === "open"
                          ? "bg-teal-50 text-[#00786F] ring-teal-100"
                          : "bg-amber-50 text-amber-700 ring-amber-100"
                      }`}
                    >
                      {ROUND_LABEL[r.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-800">
              รายการที่รอดำเนินการ
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              คลิกเพื่อดูรายการที่ต้องติดตาม
            </p>
          </div>

          {tasks.length === 0 ? (
            <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              ไม่มีรายการค้างดำเนินการ
            </div>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => (
                <button
                  key={task.name}
                  type="button"
                  onClick={task.onClick}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-2.5 text-left transition hover:border-slate-200 hover:bg-slate-100/70"
                >
                  <span className="text-sm text-slate-700">{task.name}</span>
                  <span
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold ${task.color}`}
                  >
                    {task.count.toLocaleString("th-TH")}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* DRILLDOWN MODAL แสดงข้อมูลที่ตรงกับหัวข้อที่กด */}
      {selectedView && (
        <div
          onClick={() => setSelectedView(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  {selectedView.title}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {selectedView.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedView(null)}
                className="shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                ปิด ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {selectedView.mode === "branches" ? (
                <div className="space-y-3">
                  {realBranches.map((b) => {
                    const branchAssets = safeAssets.filter(
                      (a) => a.branchId === b.id && a.status !== "in-transit"
                    );
                    const branchTransit = safeAssets.filter(
                      (a) => a.branchId === b.id && a.status === "in-transit"
                    ).length;
                    const branchNormal = branchAssets.filter(
                      (a) => !lostAssetIds.has(a.id) && a.status === "normal"
                    ).length;
                    const branchDamaged = branchAssets.filter(
                      (a) =>
                        !lostAssetIds.has(a.id) &&
                        (a.status === "damaged" || a.status === "needs-repair")
                    ).length;
                    const branchLost = branchAssets.filter((a) =>
                      lostAssetIds.has(a.id)
                    ).length;

                    return (
                      <div
                        key={b.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-base font-bold text-slate-800">
                              {b.name}
                            </h4>
                            <p className="font-mono text-xs text-slate-400">
                              รหัสสาขา: {b.id}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs font-semibold">
                            <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-[#00786F]">
                              ปกติ {branchNormal}
                            </span>
                            <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-amber-700">
                              ชำรุด/ซ่อม {branchDamaged}
                            </span>
                            <span className="rounded-lg bg-purple-50 px-2.5 py-1 text-purple-700">
                              สูญหาย {branchLost}
                            </span>
                            {branchTransit > 0 && (
                              <span className="rounded-lg bg-slate-200/70 px-2.5 py-1 text-slate-700">
                                รอรับเข้า {branchTransit}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : !selectedView.assets || selectedView.assets.length === 0 ? (
                <div className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400">
                  ไม่มีรายการทรัพย์สินในหมวดหมู่นี้
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                        <th className="px-4 py-3">รหัส</th>
                        <th className="px-4 py-3">ชื่อทรัพย์สิน</th>
                        <th className="px-4 py-3">หมวดหมู่</th>
                        <th className="px-4 py-3">สาขา</th>
                        <th className="px-4 py-3">สถานะ</th>
                        <th className="px-4 py-3">ผลตรวจนับ / หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedView.assets.map((asset) => {
                        const isLost = lostAssetIds.has(asset.id);
                        const res = roundResults[asset.id];
                        return (
                          <tr key={asset.id} className="hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono text-xs font-semibold text-[#00786F]">
                              {asset.id}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {asset.name}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {asset.type}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {getBranchLabel(asset.branchId)}
                            </td>
                            <td className="px-4 py-3">
                              {isLost ? (
                                <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700">
                                  สูญหาย
                                </span>
                              ) : (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                    asset.status === "normal"
                                      ? "bg-teal-50 text-[#00786F]"
                                      : asset.status === "in-transit"
                                        ? "bg-slate-100 text-slate-700"
                                        : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {STATUS_LABEL[asset.status]}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">
                              {res
                                ? `${RESULT_LABEL[res.result]}${res.note ? ` · ${res.note}` : ""}`
                                : asset.warrantyUntil
                                  ? `ประกันถึง ${asset.warrantyUntil}`
                                  : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/60 px-6 py-3.5">
              <button
                type="button"
                onClick={() => setSelectedView(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
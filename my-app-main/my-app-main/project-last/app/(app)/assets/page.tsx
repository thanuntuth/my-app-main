"use client";

import { useState } from "react";

import AssetListTab from "@/components/assets/AssetListTab";
import CountReviewTab from "@/components/assets/CountReviewTab";
import RepairsTab from "@/components/assets/RepairsTab";
import TransfersTab from "@/components/assets/TranfersTab";
import VendorTab from "@/components/assets/VendorTab";
import { PageTitle } from "@/components/ui";
import { useAppData } from "@/lib/storage";

type TabId = "list" | "review" | "repairs" | "transfers" | "vendor";

export default function AssetsPage() {
  const { assets, round, repairs } = useAppData();
  const [tab, setTab] = useState<TabId>("list");
  const openRepairIds = new Set(
    repairs.filter((repair) => repair.status === "in-repair").map((repair) => repair.assetId),
  );
  const repairQueue = assets.filter(
    (asset) =>
      (asset.status === "damaged" || asset.status === "needs-repair") &&
      !openRepairIds.has(asset.id),
  ).length;
  
  const tabs: { id: TabId; label: string; badge?: number | string }[] = [
    { id: "list", label: "รายการทรัพย์สิน" },
    {

  id: "review",
  label: "ตรวจผลนับ",
    },
    {
      id: "repairs",
      label: "งานซ่อม",
      badge: repairQueue > 0 ? repairQueue : undefined,
    },
    { id: "transfers", label: "การย้ายทรัพย์สิน" },
    { id: "vendor", label: "ผู้จำหน่าย" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <PageTitle>ทรัพย์สิน</PageTitle>
        <p className="text-sm text-slate-500">
          จัดการทรัพย์สิน ตรวจผลนับ งานซ่อม และการย้ายทรัพย์สิน
        </p>
      </header>

      <div className="flex max-w-full gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm sm:w-fit">
        {tabs.map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${
              tab === item.id
                ? "bg-[#00786F] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {item.label}
            {item.badge !== undefined && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  tab === item.id
                    ? "bg-white/25 text-white"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "list" && <AssetListTab />}
      {tab === "review" && <CountReviewTab />}
      {tab === "repairs" && <RepairsTab />}
      {tab === "transfers" && <TransfersTab />}
      {tab === "vendor" && <VendorTab />}
    </div>
  );
}
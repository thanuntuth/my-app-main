"use client";

import { useState } from "react";

import { Badge, Button } from "@/components/ui";
import { RESULT_LABEL, ROUND_LABEL, STATUS_LABEL } from "@/lib/labels";
import { useAppData } from "@/lib/storage";
import type { Asset, CountItemResult, CountResult } from "@/lib/types";
import { STORE_BRANCH_ID } from "@/lib/utils";
// import AssetDetailDialog from "./AssetDetailDialog";
import { EmptyState, Notice, Panel, ROW, Stat, TABLE_WRAP, TBODY, TD, TH, THEAD } from "./parts";

const TONE: Record<CountResult, "green" | "red" | "amber"> = {
  found: "green",
  "not-found": "red",
  damaged: "amber",
  "needs-repair": "amber",
};

type Filter = "all" | "issues";

type ExtendedAsset = Asset & {
  image?: string;
  receivedImage?: string;
};

// ดึง URL/Base64 รูปภาพจากผลตรวจนับ (รองรับหลายชื่อฟิลด์)
function getAttachedImage(item: unknown): string | undefined {
  if (!item || typeof item !== "object") return undefined;
  const obj = item as Record<string, unknown>;
  for (const key of ["photo", "image", "imageUrl", "img", "attachment"]) {
    if (typeof obj[key] === "string" && obj[key]) {
      return obj[key] as string;
    }
  }
  if (Array.isArray(obj.photos) && typeof obj.photos[0] === "string") {
    return obj.photos[0];
  }
  if (Array.isArray(obj.images) && typeof obj.images[0] === "string") {
    return obj.images[0];
  }
  return undefined;
}

function AssetDetailDialog({
  asset,
  result,
  onClose,
}: {
  asset: Asset;
  result?: CountItemResult;
  onClose: () => void;
}) {
  const extAsset = asset as ExtendedAsset;
  const assetPhoto = extAsset.receivedImage || extAsset.image;
  const countPhoto = getAttachedImage(result);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="rounded-md bg-teal-50 px-2.5 py-1 font-mono text-xs font-semibold text-[#00786F]">
              {asset.id}
            </span>
            <h3 className="mt-2 text-lg font-bold text-slate-800">{asset.name}</h3>
            <p className="text-xs text-slate-500">หมวดหมู่: {asset.type}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ปิด ✕
          </button>
        </div>

        <div className="mt-4 space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3.5">
            <div>
              <p className="text-xs text-slate-400">สถานะในระบบ</p>
              <p className="mt-0.5 font-semibold text-slate-800">{STATUS_LABEL[asset.status]}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">ราคาซื้อ</p>
              <p className="mt-0.5 font-semibold text-slate-800">
                {asset.price.toLocaleString("th-TH")} บาท
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Vendor</p>
              <p className="mt-0.5 font-medium text-slate-700">{asset.vendor || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">วันที่ซื้อ / ประกันถึง</p>
              <p className="mt-0.5 font-medium text-slate-700">
                {asset.purchaseDate} / {asset.warrantyUntil || "-"}
              </p>
            </div>
          </div>

          {result && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">ผลการตรวจนับรอบนี้</span>
                <Badge tone={TONE[result.result]}>{RESULT_LABEL[result.result]}</Badge>
              </div>
              {result.note && (
                <p className="mt-2 text-xs text-slate-700">
                  <span className="font-semibold">หมายเหตุ:</span> {result.note}
                </p>
              )}
            </div>
          )}

          {(assetPhoto || countPhoto) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {assetPhoto && (
                <div>
                  <p className="mb-1 text-xs font-medium text-slate-500">รูปทรัพย์สินในระบบ</p>
                  <img
                    src={assetPhoto}
                    alt={asset.name}
                    className="h-36 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain p-1"
                  />
                </div>
              )}
              {countPhoto && (
                <div>
                  <p className="mb-1 text-xs font-medium text-[#00786F]">รูปหลักฐานการตรวจนับ</p>
                  <img
                    src={countPhoto}
                    alt={`หลักฐาน ${asset.id}`}
                    className="h-36 w-full rounded-xl border border-teal-200 bg-slate-50 object-contain p-1"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            ปิดหน้าต่าง
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CountReviewTab() {
  const { assets, setAssets, round, setRound, log } = useAppData();
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  if (!round) {
    return (
      <EmptyState
        icon="📋"
        title="ยังไม่มีรอบตรวจนับ"
        text="ให้ Super admin กำหนดวันตรวจนับก่อน"
      />
    );
  }

  const assetOf = (id: string) => assets.find((a) => a.id === id);
  const results = Object.entries(round.results);

  // รายการที่ต้องนับ = ทรัพย์สินของสาขา Store ที่รับแล้ว
  const expected = assets
    .filter((a) => a.received && a.branchId === STORE_BRANCH_ID)
    .map((a) => a.id);
  const total = expected.length;
  const missing = expected.filter((id) => !round.results[id]);

  const issues = results.filter(([, r]) => r.result !== "found");
  const foundCount = results.length - issues.length;
  const progress = total > 0 ? Math.min(Math.round((results.length / total) * 100), 100) : 0;

  // ตารางผลทั้งหมด: รายการที่ต้องนับ + รายการที่มีผลนับ
  const ids = Array.from(new Set([...expected, ...Object.keys(round.results)]));
  const rows = ids.map((id) => ({
    id,
    asset: assetOf(id),
    r: round.results[id] as CountItemResult | undefined,
  }));
  const isIssue = (r?: CountItemResult) => !!r && r.result !== "found";
  const shown = filter === "issues" ? rows.filter((x) => isIssue(x.r)) : rows;

  const selectedAsset = selectedId ? assetOf(selectedId) : undefined;

  const sendRepair = (id: string) => {
    setAssets(assets.map((a) => (a.id === id ? { ...a, status: "needs-repair" } : a)));
    log("Admin", `ส่งเข้าคิวซ่อม ${id}`);
  };

  const sendBack = () => {
    setRound({ ...round, status: "open" });
    log("Admin", `ส่งผลนับรอบ ${round.name} กลับให้สาขานับใหม่`);
  };

  const closeRound = () => {
    if (!confirm("ปิดรอบแล้วจะอัปเดตสถานะทรัพย์สินตามผลนับ ต้องการดำเนินการต่อหรือไม่")) return;

    // ปิดรอบ: เอาผลนับที่ชำรุด/ต้องซ่อมไปเป็นสถานะจริงของทรัพย์สิน
    setAssets(
      assets.map((a) => {
        const r = round.results[a.id];
        return r && (r.result === "damaged" || r.result === "needs-repair")
          ? { ...a, status: r.result }
          : a;
      })
    );
    setRound({ ...round, status: "closed" });
    log("Admin", `ปิดรอบตรวจนับ ${round.name}`);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800">ตรวจผลนับ</h2>
          <p className="mt-1 text-sm text-slate-500">
            {round.name} · รอบวันที่ {round.date}
          </p>
        </div>
        <Badge tone={round.status === "review" ? "amber" : round.status === "closed" ? "green" : "gray"}>
          {ROUND_LABEL[round.status]}
        </Badge>
      </header>

      {round.status === "open" ? (
        <Panel title="สาขากำลังตรวจนับ" subtitle="ยังไม่มีผลให้ตรวจ จนกว่าสาขาจะส่งผลนับ">
          <div className="mb-2 flex items-end justify-between text-sm">
            <span className="text-slate-500">
              นับแล้ว {results.length} จาก {total} ชิ้น
            </span>
            <span className="text-2xl font-bold text-[#00786F]">{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#00786F] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Stat
              label="นับแล้ว"
              value={`${results.length} / ${total}`}
              tag="ตรวจแล้ว"
              valueColor="text-blue-600"
              tagStyle="bg-blue-50 text-blue-700"
            />
            <Stat
              label="พบ"
              value={foundCount}
              tag="ตรงตามระบบ"
              valueColor="text-emerald-600"
              tagStyle="bg-emerald-50 text-emerald-700"
            />
            <Stat
              label="ผลต่าง"
              value={issues.length}
              tag="ต้องตรวจสอบ"
              valueColor="text-amber-600"
              tagStyle="bg-amber-50 text-amber-700"
            />
            <Stat
              label="พบนอกรายการ"
              value={round.extras.length}
              tag="ไม่มีในระบบ"
              valueColor="text-red-600"
              tagStyle="bg-red-50 text-red-700"
            />
          </div>

          {missing.length > 0 && (
            <Notice title={`ยังไม่ได้นับ ${missing.length} ชิ้น`}>
              {missing.join(", ")} (ต้องนับให้ครบก่อนปิดรอบ)
            </Notice>
          )}

          <Panel
            title="ผลการตรวจนับทั้งหมด"
            subtitle={`นับแล้ว ${results.length} จาก ${total} ชิ้น`}
            action={
              <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
                {(
                  [
                    ["all", `ทั้งหมด (${rows.length})`],
                    ["issues", `ผลต่าง (${issues.length})`],
                  ] as [Filter, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      filter === id ? "bg-[#00786F] text-white" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            }
          >
            {shown.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">
                {filter === "issues" ? "ไม่มีผลต่าง" : "ไม่มีรายการตรวจนับ"}
              </p>
            ) : (
              <>
                <div className={TABLE_WRAP}>
                  <table className="w-full min-w-[850px] border-collapse text-left text-sm">
                    <thead>
                      <tr className={THEAD}>
                        <th className={TH}>ทรัพย์สิน</th>
                        <th className={TH}>ผลนับ</th>
                        <th className={TH}>หมายเหตุ</th>
                        <th className={TH}>รูปภาพแนบ</th>
                        <th className={TH}>สถานะปัจจุบัน</th>
                        <th className={TH}></th>
                      </tr>
                    </thead>
                    <tbody className={TBODY}>
                      {shown.map(({ id, asset, r }) => {
                        const issue = isIssue(r);
                        const canRepair = r?.result === "damaged" || r?.result === "needs-repair";
                        const attachedImg = getAttachedImage(r);

                        return (
                          <tr key={id} className={`${ROW} ${issue ? "bg-amber-50/40" : ""}`}>
                            <td className="px-5 py-4 font-medium text-slate-800">
                              <button
                                type="button"
                                onClick={() => asset && setSelectedId(id)}
                                disabled={!asset}
                                className="text-left transition hover:underline disabled:no-underline"
                              >
                                <span className="font-semibold text-[#00786F]">{id}</span> {asset?.name}
                              </button>
                            </td>
                            <td className="px-5 py-4">
                              {r ? (
                                <Badge tone={TONE[r.result]}>{RESULT_LABEL[r.result]}</Badge>
                              ) : (
                                <Badge>ยังไม่ได้นับ</Badge>
                              )}
                            </td>
                            <td className={TD}>{r?.note ?? "-"}</td>
                            <td className="px-5 py-3">
                              {attachedImg ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      src: attachedImg,
                                      title: `${id} ${asset?.name ?? ""}`.trim(),
                                    })
                                  }
                                  className="group relative inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-1 pr-2.5 text-xs font-medium text-[#00786F] shadow-2xs transition hover:border-[#00786F] hover:bg-teal-50/40"
                                >
                                  <img
                                    src={attachedImg}
                                    alt={`หลักฐานการตรวจนับ ${id}`}
                                    className="h-10 w-10 rounded-md object-cover transition group-hover:scale-105"
                                  />
                                  
                                </button>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className={TD}>{asset ? STATUS_LABEL[asset.status] : "-"}</td>
                            <td className="px-5 py-4 text-right">
                              {canRepair && round.status !== "closed" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={asset?.status === "needs-repair"}
                                  onClick={() => sendRepair(id)}
                                >
                                  ส่งเข้าคิวซ่อม
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-3 text-xs text-slate-400">
                  * คลิกที่ชื่อทรัพย์สินเพื่อดูรายละเอียด หรือคลิกที่รูปภาพแนบเพื่อขยายดูขนาดเต็ม
                </p>
              </>
            )}
          </Panel>

          {round.extras.length > 0 && (
            <Panel title="พบแต่ไม่อยู่ในรายการ" subtitle="ทรัพย์สินที่สาขาพบ แต่ไม่มีในระบบ">
              <ul className="space-y-2 text-sm text-slate-700">
                {round.extras.map((x, i) => {
                  const extraImg = getAttachedImage(x);
                  return (
                    <li key={i} className="flex items-center gap-3">
                      <span>
                        • {x.name}
                        {x.note ? ` (${x.note})` : ""}
                      </span>
                      {extraImg && (
                        <button
                          type="button"
                          onClick={() => setPreviewImage({ src: extraImg, title: x.name })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-[#00786F] hover:border-[#00786F]"
                        >
                          <img src={extraImg} alt={x.name} className="h-6 w-6 rounded object-cover" />
                          <span>ดูรูป</span>
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {round.status === "review" && (
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={sendBack}>
                ส่งกลับให้นับใหม่
              </Button>
              <Button disabled={missing.length > 0} onClick={closeRound}>
                ยืนยันและปิดรอบ
              </Button>
            </div>
          )}
        </>
      )}

      {/* หน้าต่างรายละเอียดทรัพย์สิน */}
      {selectedAsset && (
        <AssetDetailDialog
          asset={selectedAsset}
          result={round.results[selectedAsset.id]}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* หน้าต่างขยายดูรูปภาพแนบ */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] max-w-2xl overflow-hidden rounded-2xl bg-white p-4 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-4 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-800">
                รูปภาพหลักฐาน: {previewImage.title}
              </h3>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                ปิด ✕
              </button>
            </div>
            <div className="flex justify-center overflow-auto">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto rounded-xl object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
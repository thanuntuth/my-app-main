"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import QRCode from "qrcode";

import { Card, PageTitle } from "@/components/ui";
import {
  baht,
  yearlyDepreciation,
  monthlyDepreciation,
  remainingValue,
} from "@/lib/depreciation";
import { ROUND_LABEL } from "@/lib/labels";
import { useAppData } from "@/lib/storage";
import type { Asset, AssetStatus, CountItemResult, CountResult } from "@/lib/types";

type ActiveTab = "assets" | "receive" | "stocktake" | "lost";
type DetailMode = "inspect" | "receive" | "count" | null;

// ขยาย Type สำหรับเก็บรูปตอนรับของและรูปเพิ่มเติมแยกจากรูปแรก (ไม่เขียนทับกัน)
type ExtendedAsset = Asset & {
  image?: string;
  receivedImage?: string;
  extraImages?: string[];
  depreciationRate?: number;
};

type ExtendedCountItemResult = CountItemResult & {
  image?: string;
  photo?: string;
};


const STATUS_BADGE: Record<AssetStatus, { label: string; style: string; boxStyle: string }> = {
  normal: {
    label: "ปกติ (อยู่ในคลังสาขา)",
    style: "bg-teal-50 text-[#00786F] ring-teal-200",
    boxStyle: "border-teal-300 bg-teal-50/70 text-[#00786F]",
  },
  damaged: {
    label: "ชำรุด",
    style: "bg-red-50 text-red-600 ring-red-200",
    boxStyle: "border-red-300 bg-red-50/70 text-red-600",
  },
  "needs-repair": {
    label: "ต้องซ่อม",
    style: "bg-amber-50 text-amber-700 ring-amber-200",
    boxStyle: "border-amber-300 bg-amber-50/70 text-amber-700",
  },
  "in-transit": {
    label: "ระหว่างจัดส่ง (รอสาขายืนยันรับ)",
    style: "bg-amber-50 text-amber-700 ring-amber-200",
    boxStyle: "border-amber-300 bg-amber-50/70 text-amber-700",
  },
};

const SHORT_STATUS_LABEL: Record<AssetStatus, string> = {
  normal: "ปกติ",
  damaged: "ชำรุด",
  "needs-repair": "ต้องซ่อม",
  "in-transit": "ระหว่างจัดส่ง",
};

const LOST_BADGE = {
  label: "สูญหาย",
  style: "bg-purple-50 text-purple-700 ring-purple-200",
  boxStyle: "border-purple-300 bg-purple-50/70 text-purple-700",
};

const COUNT_BADGE: Record<CountResult, { label: string; style: string }> = {
  found: { label: "ปกติ", style: "bg-teal-50 text-[#00786F]" },
  damaged: { label: "ชำรุด", style: "bg-red-50 text-red-600" },
  "needs-repair": { label: "ต้องซ่อม", style: "bg-amber-50 text-amber-700" },
  "not-found": { label: "ไม่พบ / สูญหาย", style: "bg-purple-50 text-purple-700" },
};

const formatSlashDate = (dateStr: string) => {
  if (!dateStr) return "-";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// ย่อขนาดรูปภาพอัตโนมัติ (รองรับการถ่ายรูปจากกล้องมือถือโดยไม่ทำให้ localStorage เต็ม)
function compressImageFile(file: File, maxWidth = 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ไม่สามารถอ่านไฟล์รูปภาพได้"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("ไฟล์รูปภาพไม่ถูกต้อง"));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("เบราว์เซอร์ไม่รองรับการประมวลผลรูปภาพ"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        let dataUrl = canvas.toDataURL("image/jpeg", 0.75);
        if (dataUrl.length > 650 * 1024) {
          dataUrl = canvas.toDataURL("image/jpeg", 0.5);
        }
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function BranchWorkspacePage() {
  const { assets, setAssets, branches, round, setRound, log } = useAppData();

  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  useEffect(() => {
    setCurrentDate(new Date());
  }, []);

  const getRemainingValue = (asset: ExtendedAsset): number => {
    const now = currentDate;
    if (now === null) return asset.price;
    return remainingValue(asset, now);
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>("assets");
  const [detailMode, setDetailMode] = useState<DetailMode>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [tempReceiveImage, setTempReceiveImage] = useState<string>("");
  const [pendingExtraImages, setPendingExtraImages] = useState<string[]>([]);
  const [countPhoto, setCountPhoto] = useState<string>("");
  const [countResult, setCountResult] = useState<CountResult>("found");
  const [countNote, setCountNote] = useState<string>("");
  const [formError, setFormError] = useState<string>("");
  const [toastMsg, setToastMsg] = useState<string>("");

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  const extendedAssets = useMemo(
    () => (Array.isArray(assets) ? (assets as ExtendedAsset[]) : []),
    [assets]
  );
  const safeBranches = useMemo(
    () => (Array.isArray(branches) ? branches : []),
    [branches]
  );

  // 1. ค้นหา "สาขา 1" (ไม่เอาบริษัทแม่ / คลังกลาง)
  const branch1 = useMemo(() => {
    const valid = safeBranches.filter(
      (b) => b.id !== "hq" && !b.name.includes("บริษัทแม่") && !b.name.includes("คลังกลาง")
    );
    return valid.find((b) => b.name.includes("สาขา 1") || b.name.includes("สาขา1")) || valid[0];
  }, [safeBranches]);

  const branch1Id = branch1?.id || "";
  const branch1Name = branch1?.name || "สาขา 1";

  // 2. แยกรายการทรัพย์สินของสาขา 1
  const branchAssets = useMemo(() => {
    if (!branch1Id) return [];
    return extendedAssets.filter((a) => a.branchId === branch1Id && a.status !== "in-transit");
  }, [extendedAssets, branch1Id]);

  const incomingAssets = useMemo(() => {
    if (!branch1Id) return [];
    return extendedAssets.filter((a) => a.branchId === branch1Id && a.status === "in-transit");
  }, [extendedAssets, branch1Id]);

  // 3. รอบตรวจนับปัจจุบันจาก useAppData()
  const activeRound = round ?? null;

  // 4. รวบรวมรายการที่สูญหายของสาขา 1 จากผลตรวจนับ (result === "not-found")
  const lostIdSet = useMemo(() => {
    const ids = new Set<string>();
    Object.entries(activeRound?.results ?? {}).forEach(([id, r]) => {
      if (r.result === "not-found") {
        ids.add(id);
      }
    });
    return ids;
  }, [activeRound]);

  const lostAssets = useMemo(() => {
    return branchAssets.filter((a) => lostIdSet.has(a.id));
  }, [branchAssets, lostIdSet]);

  // รายการที่ต้องตรวจนับในรอบนี้ (อ้างอิง checklists ของสาขานี้)
  const countableAssets = useMemo(() => {
    if (!activeRound) return [];
    const allChecklists = activeRound.checklists ?? [];
    if (allChecklists.length > 0) {
      const myLists = allChecklists.filter((c) => c.branchId === branch1Id);
      const sentLists = myLists.filter((c) => c.status === "sent");
      const targetLists = sentLists.length > 0 ? sentLists : myLists;
      const idSet = new Set(targetLists.flatMap((c) => c.assetIds));
      return branchAssets.filter((a) => idSet.has(a.id));
    }
    return branchAssets;
  }, [activeRound, branchAssets, branch1Id]);

  const countedCount = useMemo(() => {
    if (!activeRound) return 0;
    return countableAssets.filter((a) => Boolean(activeRound.results?.[a.id])).length;
  }, [activeRound, countableAssets]);

  const progressPct =
    countableAssets.length > 0
      ? Math.min(Math.round((countedCount / countableAssets.length) * 100), 100)
      : 0;

  // กรองรายการในแท็บ "ทรัพย์สินในสาขา"
  const filteredBranchAssets = useMemo(() => {
    return branchAssets.filter((item) => {
      const matchStatus =
        statusFilter === "all" || statusFilter === "ACTIVE"
          ? true
          : statusFilter === "lost"
            ? lostIdSet.has(item.id)
            : item.status === statusFilter;

      const keyword = searchTerm.trim().toLowerCase();
      const noteText = (activeRound?.results?.[item.id]?.note || "").toLowerCase();
      const matchKeyword =
        !keyword ||
        item.id.toLowerCase().includes(keyword) ||
        item.name.toLowerCase().includes(keyword) ||
        item.type.toLowerCase().includes(keyword) ||
        (item.vendor || "").toLowerCase().includes(keyword) ||
        noteText.includes(keyword);

      return matchStatus && matchKeyword;
    });
  }, [branchAssets, statusFilter, searchTerm, activeRound, lostIdSet]);

  const selectedAsset: ExtendedAsset | undefined = useMemo(
    () => extendedAssets.find((a) => a.id === selectedAssetId),
    [extendedAssets, selectedAssetId]
  );

  useEffect(() => {
    if ((detailMode === "inspect" || detailMode === "receive") && selectedAsset) {
      QRCode.toDataURL(selectedAsset.id, { width: 180, margin: 1 })
        .then(setQrDataUrl)
        .catch(() => setQrDataUrl(""));
    } else {
      setQrDataUrl("");
    }
  }, [detailMode, selectedAsset]);

  const openDetail = (mode: DetailMode, asset: ExtendedAsset) => {
    setFormError("");
    setSelectedAssetId(asset.id);
    setDetailMode(mode);

    if (mode === "receive") {
      setTempReceiveImage(asset.receivedImage || "");
      setPendingExtraImages([]);
    } else if (mode === "inspect") {
      setTempReceiveImage("");
      setPendingExtraImages([]);
    } else if (mode === "count") {
      const existing = activeRound?.results?.[asset.id] as ExtendedCountItemResult | undefined;
      setCountResult(existing?.result || "found");
      setCountNote(existing?.note || "");
      setCountPhoto(existing?.image || existing?.photo || "");
    }
  };

  const closeDetail = () => {
    setDetailMode(null);
    setSelectedAssetId(null);
    setPendingExtraImages([]);
    setTempReceiveImage("");
    setCountPhoto("");
    setFormError("");
  };

  const handlePrintQr = () => {
    if (!selectedAsset || !qrDataUrl) return;
    const printWindow = window.open("", "_blank", "width=420,height=520");
    if (!printWindow) {
      setFormError("เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาต Pop-up เพื่อพิมพ์ QR Code");
      return;
    }
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>QR Code - ${selectedAsset.id}</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center; }
            img { width: 220px; height: 220px; }
            h2 { margin: 12px 0 4px; font-size: 18px; }
            p { margin: 0; color: #475569; font-size: 14px; }
          </style>
        </head>
        <body>
          <img src="${qrDataUrl}" alt="QR Code" />
          <h2>${selectedAsset.id}</h2>
          <p>${selectedAsset.name}</p>
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleReceiveImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setFormError("");
      const compressed = await compressImageFile(file);
      setTempReceiveImage(compressed);
    } catch {
      setFormError("ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่");
    }
  };

  const handleAddExtraImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setFormError("");
      const compressed = await compressImageFile(file);
      setPendingExtraImages((prev) => [...prev, compressed]);
    } catch {
      setFormError("ไม่สามารถเพิ่มรูปภาพได้ กรุณาลองใหม่");
    }
  };

  const handleCountImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      setFormError("");
      const compressed = await compressImageFile(file);
      setCountPhoto(compressed);
    } catch {
      setFormError("ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่");
    }
  };

  const handleSaveExtraPhotos = () => {
    if (!selectedAsset) return;
    if (pendingExtraImages.length === 0) {
      closeDetail();
      return;
    }

    const updated = extendedAssets.map((a) =>
      a.id === selectedAsset.id
        ? {
            ...a,
            extraImages: [...(a.extraImages || []), ...pendingExtraImages],
          }
        : a
    );
    setAssets(updated);
    log(
      branch1Name,
      `เพิ่มรูปภาพทรัพย์สิน ${selectedAsset.id} จำนวน ${pendingExtraImages.length} รูป`
    );
    showToast(`เพิ่มรูปภาพเรียบร้อยแล้ว (${pendingExtraImages.length} รูป)`);
    closeDetail();
  };

  // บังคับแนบรูปภาพตอนรับของก่อนกดยืนยันรับทรัพย์สิน
  const handleConfirmReceive = () => {
    if (!selectedAsset) return;
    if (!tempReceiveImage) {
      setFormError("กรุณาแนบรูปภาพตอนรับของก่อนกดยืนยันรับทรัพย์สิน");
      return;
    }

    const updated = extendedAssets.map((a) =>
      a.id === selectedAsset.id
        ? {
            ...a,
            status: "normal" as AssetStatus,
            received: true,
            receivedImage: tempReceiveImage,
          }
        : a
    );
    setAssets(updated);
    log(branch1Name, `ยืนยันรับทรัพย์สิน ${selectedAsset.id} (${selectedAsset.name})`);
    showToast(`รับ "${selectedAsset.name}" เข้าสาขาเรียบร้อย`);
    closeDetail();
  };

  const handleSaveCount = () => {
    if (!selectedAsset || !activeRound) return;

    const isProblem = countResult === "damaged" || countResult === "needs-repair";
    const requiresPhoto = countResult === "found" || isProblem;

    if (isProblem && !countNote.trim()) {
      setFormError("กรุณาระบุหมายเหตุอาการชำรุดก่อนบันทึก");
      return;
    }

    if (requiresPhoto && !countPhoto) {
      setFormError(
        isProblem
          ? "กรุณาแนบรูปภาพความชำรุดก่อนบันทึก"
          : "กรุณาแนบรูปภาพหลักฐานการตรวจนับก่อนบันทึก"
      );
      return;
    }

    const nextResults: Record<string, ExtendedCountItemResult> = {
      ...activeRound.results,
      [selectedAsset.id]: {
        result: countResult,
        ...(countNote.trim() ? { note: countNote.trim() } : {}),
        ...(requiresPhoto && countPhoto ? { image: countPhoto, photo: countPhoto } : {}),
      },
    };
    setRound({ ...activeRound, results: nextResults });

    const mappedStatus: AssetStatus =
      countResult === "found"
        ? "normal"
        : countResult === "damaged"
          ? "damaged"
          : countResult === "needs-repair"
            ? "needs-repair"
            : selectedAsset.status;

    const updated = extendedAssets.map((a) =>
      a.id === selectedAsset.id
        ? {
            ...a,
            status: mappedStatus,
          }
        : a
    );
    setAssets(updated);

    log(branch1Name, `ตรวจนับ ${selectedAsset.id}: ${COUNT_BADGE[countResult].label}`);
    showToast(`บันทึกผลตรวจนับ ${selectedAsset.id} แล้ว`);
    closeDetail();
  };

  const handleSubmitRoundToAdmin = () => {
    if (!activeRound) return;
    setRound({ ...activeRound, status: "review" });
    log(branch1Name, `ส่งผลตรวจนับวันที่ ${formatSlashDate(activeRound.date)} ให้แอดมินตรวจสอบ`);
    showToast("ส่งผลตรวจนับให้แอดมินเรียบร้อยแล้ว");
  };

  const renderAssetStatusBadge = (asset: Asset) => {
    if (lostIdSet.has(asset.id)) {
      return (
        <span
          className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${LOST_BADGE.style}`}
        >
          {LOST_BADGE.label}
        </span>
      );
    }

    return (
      <span
        className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
          STATUS_BADGE[asset.status].style
        }`}
      >
        {SHORT_STATUS_LABEL[asset.status]}
      </span>
    );
  };

  // =========================================================================
  // มุมมองหน้าจอย่อย: โหมด "รับของเข้าสาขา" และ "ตรวจสอบทรัพย์สินในคลัง"
  // =========================================================================
  if ((detailMode === "receive" || detailMode === "inspect") && selectedAsset) {
    const isReceiveMode = detailMode === "receive";
const usefulLife = selectedAsset.usefulLifeYears ?? 0;

const depRate =
  selectedAsset.depreciationRate ??
  (usefulLife > 0 ? 100 / usefulLife : 0);

const depPerYear = yearlyDepreciation(selectedAsset.price, depRate);
const depPerMonth = monthlyDepreciation(selectedAsset.price, depRate);
const remVal = getRemainingValue(selectedAsset);
    const isLost = lostIdSet.has(selectedAsset.id);
    const latestNote = activeRound?.results?.[selectedAsset.id]?.note;

    const firstReceivePhoto = selectedAsset.receivedImage || selectedAsset.image || "";
    const allAdditionalPhotos = [
      ...(selectedAsset.extraImages || []),
      ...pendingExtraImages,
    ];

    return (
      <main className="w-full min-w-0 max-w-full space-y-5 overflow-x-hidden pb-8">
        <header>
          <PageTitle>
            {isReceiveMode ? "ตรวจสอบรายการก่อนรับเข้าสาขา" : "รายละเอียดทรัพย์สินในสาขา"}
          </PageTitle>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* ฝั่งซ้าย */}
          <div className="space-y-5 lg:col-span-7">
            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">ข้อมูลรายการ</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    รหัสทรัพย์สิน / Asset ID
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {selectedAsset.id}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    ชื่อทรัพย์สิน
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {selectedAsset.name}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">Vendor</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {selectedAsset.vendor || "-"}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">หมวดหมู่</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {selectedAsset.type}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    {isReceiveMode ? "สาขาปลายทาง" : "สาขาที่รับผิดชอบ"}
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    <span>{branch1Name}</span>
                    <span className="text-xs text-slate-400">▾</span>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    สถานะปัจจุบัน
                  </label>
                  <div
                    className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${
                      isLost ? LOST_BADGE.boxStyle : STATUS_BADGE[selectedAsset.status].boxStyle
                    }`}
                  >
                    {isLost ? LOST_BADGE.label : STATUS_BADGE[selectedAsset.status].label}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    ประกันถึงวันที่
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {selectedAsset.warrantyUntil || "ไม่มีประกัน"}
                  </div>
                </div>
              </div>

              {latestNote && (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
                  <span className="font-semibold">หมายเหตุตรวจนับล่าสุด: </span>
                  {latestNote}
                </div>
              )}
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">ข้อมูลค่าเสื่อมราคา</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    ราคาซื้อ (บาท)
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {baht(selectedAsset.price)}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">วันที่ซื้อ</label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {formatSlashDate(selectedAsset.purchaseDate)}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-600">
                    อัตราค่าเสื่อมราคา (% ต่อปี)
                  </label>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-700">
                    {depRate}% ต่อปี
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">ค่าเสื่อมราคาต่อปี</p>
                  <p className="mt-1.5 text-lg font-bold text-slate-800">{baht(depPerYear)}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">ค่าเสื่อมราคาต่อเดือน</p>
                  <p className="mt-1.5 text-lg font-bold text-slate-800">{baht(depPerMonth)}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs text-slate-500">มูลค่าคงเหลือปัจจุบัน</p>
                  <p className="mt-1.5 text-lg font-bold text-slate-800">{baht(remVal)}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* ฝั่งขวา */}
          <div className="space-y-5 lg:col-span-5">
            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">รูปทรัพย์สิน</h2>

              {isReceiveMode ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs text-slate-500">รูปภาพที่ส่งมาจากคลัง</p>
                      <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50 p-2">
                        {selectedAsset.image ? (
                          <img
                            src={selectedAsset.image}
                            alt={selectedAsset.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-slate-400">ไม่มีรูปภาพแนบมา</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-medium text-[#00786F]">
                        รูปภาพตอนรับของ <span className="text-red-500">* (บังคับแนบรูป)</span>
                      </p>
                      <div
                        className={`flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-dashed p-2 ${
                          formError && !tempReceiveImage
                            ? "border-red-400 bg-red-50/40"
                            : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        {tempReceiveImage ? (
                          <img
                            src={tempReceiveImage}
                            alt="รูปภาพตอนรับของ"
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <span className="text-center text-xs text-slate-400">
                            กรุณาอัปโหลดรูปภาพตอนรับของ
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#00786F] bg-white px-4 py-2 text-xs font-semibold text-[#00786F] transition hover:bg-teal-50">
                      <span>
                        {tempReceiveImage ? "เปลี่ยนรูปภาพตอนรับของ" : "+ เพิ่มรูปภาพตอนรับของ"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiveImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-500">
                        รูปภาพหลักในระบบ
                      </p>
                      {firstReceivePhoto ? (
                        <img
                          src={firstReceivePhoto}
                          alt={selectedAsset.name}
                          className="h-44 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                          ยังไม่มีรูปภาพหลัก
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-medium text-[#00786F]">
                        รูปภาพเพิ่มเติม ({allAdditionalPhotos.length} รูป)
                      </p>
                      {allAdditionalPhotos.length > 0 ? (
                        <div className="grid h-44 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/50 p-2">
                          {allAdditionalPhotos.map((imgSrc, idx) => (
                            <img
                              key={idx}
                              src={imgSrc}
                              alt={`รูปเพิ่มเติม ${idx + 1}`}
                              className="h-20 w-full rounded-lg border border-slate-200 bg-white object-cover"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                          ยังไม่มีรูปภาพเพิ่มเติม
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedAsset.image && selectedAsset.receivedImage && (
                    <p className="mt-2 text-xs text-slate-400">
                      * มีรูปภาพจากคลังและรูปตอนรับของบันทึกไว้ครบถ้วนแล้ว
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#00786F] bg-white px-4 py-2 text-xs font-semibold text-[#00786F] transition hover:bg-teal-50">
                      <span>+ เพิ่มรูปภาพ</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAddExtraImage}
                        className="hidden"
                      />
                    </label>

                    {pendingExtraImages.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPendingExtraImages([])}
                        className="text-xs font-medium text-red-500 hover:text-red-700"
                      >
                        ล้างรูปที่เพิ่งเพิ่ม ({pendingExtraImages.length})
                      </button>
                    )}
                  </div>
                </>
              )}
            </Card>

            <Card className="p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-800">QR Code</h2>

              <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/40 p-5">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR ${selectedAsset.id}`}
                    className="h-44 w-44 rounded-lg bg-white p-2 object-contain shadow-xs"
                  />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center text-xs text-slate-400">
                    กำลังสร้าง QR Code...
                  </div>
                )}

                <p className="mt-3 font-mono text-sm font-bold text-slate-800">{selectedAsset.id}</p>

                <button
                  type="button"
                  onClick={handlePrintQr}
                  disabled={!qrDataUrl}
                  className="mt-3 rounded-xl bg-[#00786F] px-5 py-2 text-xs font-semibold text-white transition hover:bg-[#00665F] disabled:opacity-50"
                >
                  พิมพ์ QR Code
                </button>
              </div>
            </Card>
          </div>
        </div>

        {/* ปุ่มด้านล่างขวา */}
        <div className="flex flex-col gap-2.5 pt-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          {formError && (
            <p className="text-xs font-medium text-red-600 sm:mr-auto">{formError}</p>
          )}

          <button
            type="button"
            onClick={closeDetail}
            className="w-full rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            ย้อนกลับ
          </button>

          {isReceiveMode ? (
            <button
              type="button"
              onClick={handleConfirmReceive}
              className="w-full rounded-xl bg-[#00786F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00665F] sm:w-auto"
            >
              ยืนยันรับทรัพย์สิน
            </button>
          ) : (
            pendingExtraImages.length > 0 && (
              <button
                type="button"
                onClick={handleSaveExtraPhotos}
                className="w-full rounded-xl bg-[#00786F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00665F] sm:w-auto"
              >
                บันทึกรูปภาพเพิ่มเติม ({pendingExtraImages.length})
              </button>
            )
          )}
        </div>
      </main>
    );
  }

  // =========================================================================
  // มุมมองหน้าจอย่อย: โหมด "ตรวจนับรายชิ้น"
  // =========================================================================
  if (detailMode === "count" && selectedAsset) {
    const isProblem = countResult === "damaged" || countResult === "needs-repair";
    const requiresPhoto = countResult === "found" || isProblem;
    const thumb = selectedAsset.receivedImage || selectedAsset.image;

    return (
      <main className="w-full min-w-0 max-w-full space-y-5 overflow-x-hidden pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={closeDetail}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <span>←</span>
            <span>กลับหน้ารวม</span>
          </button>

          <span className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-[#00786F]">
            {branch1Name}
          </span>
        </div>

        <Card className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              {thumb ? (
                <img
                  src={thumb}
                  alt={selectedAsset.name}
                  className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-cover sm:h-16 sm:w-16"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[11px] text-slate-400 sm:h-16 sm:w-16">
                  ไม่มีรูป
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">
                    {selectedAsset.id}
                  </span>
                  {renderAssetStatusBadge(selectedAsset)}
                </div>
                <h1 className="mt-1.5 text-lg font-bold text-slate-800 sm:text-xl">
                  {selectedAsset.name}
                </h1>
                <p className="text-xs text-slate-500 sm:text-sm">หมวดหมู่: {selectedAsset.type}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-400">ราคาซื้อ</p>
              <p className="text-base font-bold text-slate-800 sm:text-lg">
                {baht(selectedAsset.price)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="space-y-5 p-4 sm:p-6">
          <div>
            <p className="mb-3 text-sm font-bold text-slate-800">เลือกผลการตรวจนับ</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  value: "found" as CountResult,
                  title: "ปกติ",
                  desc: "พบทรัพย์สิน (บังคับแนบรูป)",
                  activeClass: "border-[#00786F] bg-teal-50/70 text-[#00786F]",
                },
                {
                  value: "damaged" as CountResult,
                  title: "ชำรุด",
                  desc: "พบความเสียหาย (บังคับหมายเหตุ + รูป)",
                  activeClass: "border-red-500 bg-red-50/70 text-red-600",
                },
                {
                  value: "not-found" as CountResult,
                  title: "ไม่พบ / สูญหาย",
                  desc: "หาไม่พบในพื้นที่สาขา",
                  activeClass: "border-purple-500 bg-purple-50/70 text-purple-700",
                },
              ].map((opt) => {
                const selected = countResult === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setCountResult(opt.value);
                      setFormError("");
                    }}
                    className={`rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? opt.activeClass
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <p className="text-base font-bold">{opt.title}</p>
                    <p className="mt-1 text-xs opacity-80">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {requiresPhoto && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-semibold text-slate-800">
                    {isProblem ? "แนบรูปภาพความชำรุด" : "แนบรูปภาพทรัพย์สินที่ตรวจนับ"}{" "}
                    <span className="text-red-500">* (บังคับแนบรูปภาพ)</span>
                  </span>
                  <p className="text-xs text-slate-400">ถ่ายรูปจากกล้องมือถือหรือเลือกไฟล์ได้ทันที</p>
                </div>

                <label className="cursor-pointer rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-[#00786F] shadow-sm ring-1 ring-slate-200 transition hover:bg-teal-50">
                  {countPhoto ? "เปลี่ยนรูปภาพ" : "+ ถ่ายรูป / เลือกรูป"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCountImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {countPhoto ? (
                <img
                  src={countPhoto}
                  alt="หลักฐานการตรวจนับ"
                  className="mt-2 h-48 w-full rounded-xl border border-slate-200 bg-white object-contain"
                />
              ) : (
                <div className="mt-2 flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                  กรุณาอัปโหลดรูปภาพเพื่อยืนยันการตรวจนับ
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
              หมายเหตุ {isProblem && <span className="text-red-500">* (บังคับระบุอาการ)</span>}
            </label>
            <textarea
              rows={2}
              value={countNote}
              onChange={(e) => setCountNote(e.target.value)}
              placeholder={
                isProblem
                  ? "ระบุอาการชำรุด เช่น หน้าจอแตก, เปิดไม่ติด..."
                  : countResult === "not-found"
                    ? "ระบุสถานที่หรือจุดที่ตรวจสอบล่าสุด (ถ้ามี)"
                    : "หมายเหตุเพิ่มเติม (ถ้ามี)"
              }
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#00786F]"
            />

            {formError && <p className="text-xs font-medium text-red-600">{formError}</p>}
          </div>

          <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={closeDetail}
              className="w-full rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 sm:w-auto"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSaveCount}
              className="w-full rounded-xl bg-[#00786F] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00665F] sm:w-auto"
            >
              บันทึกผลตรวจนับ
            </button>
          </div>
        </Card>
      </main>
    );
  }

  // =========================================================================
  // มุมมองหน้ารวม (การ์ดบนมือถือ + ตารางบนคอม)
  // =========================================================================
  return (
    <main className="w-full min-w-0 max-w-full space-y-4 overflow-x-hidden sm:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageTitle>จัดการทรัพย์สิน ({branch1Name})</PageTitle>
          <p className="text-xs text-slate-500 sm:text-sm">
            ตรวจสอบทรัพย์สิน รับของเข้าสาขา ตรวจนับ และติดตามรายการสูญหายได้ในหน้าเดียว
          </p>
        </div>

        {toastMsg && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-medium text-[#00786F] sm:text-sm">
            ✓ {toastMsg}
          </div>
        )}
      </header>

      {/* 4 การ์ดสลับโหมดงาน */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => setActiveTab("assets")}
          className={`rounded-2xl border-2 p-3.5 text-left transition sm:p-5 ${
            activeTab === "assets"
              ? "border-[#00786F] bg-white shadow-sm"
              : "border-slate-200 bg-white/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-600 sm:text-sm">ทรัพย์สินในสาขา</span>
            <span className="rounded-lg bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-[#00786F] sm:px-2.5 sm:py-1 sm:text-xs">
              ทั้งหมด
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between sm:mt-3">
            <span className="text-2xl font-bold text-slate-800 sm:text-3xl">
              {branchAssets.length.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-slate-400">รายการ</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("receive")}
          className={`rounded-2xl border-2 p-3.5 text-left transition sm:p-5 ${
            activeTab === "receive"
              ? "border-[#00786F] bg-white shadow-sm"
              : "border-slate-200 bg-white/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-600 sm:text-sm">รอรับเข้าสาขา</span>
            {incomingAssets.length > 0 ? (
              <span className="rounded-lg bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 sm:px-2.5 sm:py-1 sm:text-xs">
                รอตรวจรับ
              </span>
            ) : (
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 sm:px-2.5 sm:py-1 sm:text-xs">
                ครบแล้ว
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-baseline justify-between sm:mt-3">
            <span
              className={`text-2xl font-bold sm:text-3xl ${
                incomingAssets.length > 0 ? "text-amber-600" : "text-slate-800"
              }`}
            >
              {incomingAssets.length.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-slate-400">รายการ</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stocktake")}
          className={`rounded-2xl border-2 p-3.5 text-left transition sm:p-5 ${
            activeTab === "stocktake"
              ? "border-[#00786F] bg-white shadow-sm"
              : "border-slate-200 bg-white/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-600 sm:text-sm">ตรวจนับรอบนี้</span>
            <span
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${
                !activeRound
                  ? "bg-slate-100 text-slate-500"
                  : activeRound.status === "open"
                    ? "bg-teal-50 text-[#00786F]"
                    : "bg-amber-50 text-amber-700"
              }`}
            >
              {activeRound ? ROUND_LABEL[activeRound.status] : "ไม่มีรอบ"}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between sm:mt-3">
            <span className="text-2xl font-bold text-[#00786F] sm:text-3xl">
              {activeRound ? `${countedCount}/${countableAssets.length}` : "-"}
            </span>
            <span className="text-xs text-slate-400">
              {activeRound ? `${progressPct}%` : "รอเปิดรอบ"}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("lost")}
          className={`rounded-2xl border-2 p-3.5 text-left transition sm:p-5 ${
            activeTab === "lost"
              ? "border-purple-600 bg-white shadow-sm"
              : "border-slate-200 bg-white/80 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs font-semibold text-slate-600 sm:text-sm">ทรัพย์สินสูญหาย</span>
            <span
              className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs ${
                lostAssets.length > 0
                  ? "bg-purple-50 text-purple-700"
                  : "bg-red-100 text-red-500"
              }`}
            >
              {lostAssets.length > 0 ? "ติดตาม" : "ปกติ"}
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between sm:mt-3">
            <span
              className={`text-2xl font-bold sm:text-3xl ${
                lostAssets.length > 0 ? "text-red-600" : "text-red-500"
              }`}
            >
              {lostAssets.length.toLocaleString("th-TH")}
            </span>
            <span className="text-xs text-slate-400">รายการ</span>
          </div>
        </button>
      </section>

      {/* แท็บ 1: ทรัพย์สินในสาขา */}
      {activeTab === "assets" && (
        <Card className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหารหัส, ชื่อทรัพย์สิน, หมายเหตุ..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-[#00786F] sm:w-72"
            />

            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "all", label: "ทั้งหมด" },
                { key: "normal", label: "ปกติ" },
                { key: "damaged", label: "ชำรุด" },
                { key: "needs-repair", label: "ต้องซ่อม" },
                { key: "lost", label: "สูญหาย" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === tab.key
                      ? "bg-[#00786F] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredBranchAssets.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-400">
              ไม่พบรายการทรัพย์สิน
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {filteredBranchAssets.map((asset) => {
                  const note = activeRound?.results?.[asset.id]?.note;
                  return (
                    <div
                      key={asset.id}
                      className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{asset.name}</p>
                          <p className="font-mono text-xs text-slate-400">
                            {asset.id} · {asset.type}
                          </p>
                        </div>
                        {renderAssetStatusBadge(asset)}
                      </div>

                      {note && (
                        <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
                          หมายเหตุ: {note}
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                        <div className="text-xs text-slate-500">
                          คงเหลือ{" "}
                          <span className="font-semibold text-slate-800">
                           {baht(getRemainingValue(asset))}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDetail("inspect", asset)}
                          className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-[#00786F] hover:text-[#00786F]"
                        >
                          ตรวจสอบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-400">
                      <th className="pb-3 font-medium">รหัส / รายการ</th>
                      <th className="pb-3 font-medium">หมวดหมู่</th>
                      <th className="pb-3 font-medium">มูลค่าคงเหลือ</th>
                      <th className="pb-3 font-medium">สถานะ</th>
                      <th className="pb-3 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBranchAssets.map((asset) => {
                      const note = activeRound?.results?.[asset.id]?.note;
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 pr-4">
                            <div className="font-semibold text-slate-800">{asset.name}</div>
                            <div className="font-mono text-xs text-slate-400">{asset.id}</div>
                            {note && (
                              <div className="mt-0.5 text-xs text-amber-600">หมายเหตุ: {note}</div>
                            )}
                          </td>
                          <td className="py-3.5 text-slate-600">{asset.type}</td>
                          <td className="py-3.5 font-medium text-slate-700">
                            {baht(getRemainingValue(asset))}
                          </td>
                          <td className="py-3.5">{renderAssetStatusBadge(asset)}</td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openDetail("inspect", asset)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#00786F] hover:text-[#00786F]"
                            >
                              ตรวจสอบ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* แท็บ 2: รอรับเข้าสาขา */}
      {activeTab === "receive" && (
        <Card className="p-4 sm:p-6">
          {incomingAssets.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-400">
              ไม่มีรายการที่รอรับเข้าสาขาในขณะนี้
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {incomingAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="space-y-3 rounded-xl border border-slate-200 bg-white p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-800">{asset.name}</p>
                        <p className="font-mono text-xs text-slate-400">
                          {asset.id} · {asset.type}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                        รอตรวจรับ
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-xs font-semibold text-slate-700">{baht(asset.price)}</span>
                      <button
                        type="button"
                        onClick={() => openDetail("receive", asset)}
                        className="rounded-lg bg-[#00786F] px-3.5 py-1.5 text-xs font-semibold text-white"
                      >
                        ตรวจรับของ
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-400">
                      <th className="pb-3 font-medium">รหัส / รายการ</th>
                      <th className="pb-3 font-medium">หมวดหมู่</th>
                      <th className="pb-3 font-medium">ราคาซื้อ</th>
                      <th className="pb-3 font-medium">สถานะ</th>
                      <th className="pb-3 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incomingAssets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-50/70">
                        <td className="py-3.5 pr-4">
                          <div className="font-semibold text-slate-800">{asset.name}</div>
                          <div className="font-mono text-xs text-slate-400">{asset.id}</div>
                        </td>
                        <td className="py-3.5 text-slate-600">{asset.type}</td>
                        <td className="py-3.5 font-medium text-slate-700">{baht(asset.price)}</td>
                        <td className="py-3.5">
                          <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
                            รอตรวจรับ
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail("receive", asset)}
                            className="rounded-lg bg-[#00786F] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#00665F]"
                          >
                            ตรวจรับของ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* แท็บ 3: ตรวจนับทรัพย์สิน */}
      {activeTab === "stocktake" && (
        <Card className="space-y-4 p-4 sm:space-y-5 sm:p-6">
          {!activeRound ? (
            <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-400">
              ยังไม่มีรอบตรวจนับสำหรับ {branch1Name}
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    รอบตรวจนับวันที่ {formatSlashDate(activeRound.date)}
                  </h2>
                  <p className="text-xs text-slate-500">
                    ตรวจนับแล้ว {countedCount} จาก {countableAssets.length} รายการ ({progressPct}%)
                  </p>
                </div>

                {activeRound.status === "open" ? (
                  <button
                    type="button"
                    disabled={countedCount === 0}
                    onClick={handleSubmitRoundToAdmin}
                    className="w-full rounded-xl bg-[#00786F] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#00665F] disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto sm:py-2"
                  >
                    ส่งผลตรวจนับให้แอดมิน
                  </button>
                ) : (
                  <span className="self-start rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200 sm:self-auto">
                    {ROUND_LABEL[activeRound.status]}
                  </span>
                )}
              </div>

              <div className="space-y-3 md:hidden">
                {countableAssets.map((asset) => {
                  const res = activeRound.results?.[asset.id];
                  const isLocked = activeRound.status !== "open";

                  return (
                    <div
                      key={asset.id}
                      className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{asset.name}</p>
                          <p className="font-mono text-xs text-slate-400">
                            {asset.id} · {asset.type}
                          </p>
                        </div>

                        {res ? (
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              COUNT_BADGE[res.result].style
                            }`}
                          >
                            {COUNT_BADGE[res.result].label}
                          </span>
                        ) : (
                          <span className="shrink-0 text-xs text-slate-400">รอตรวจนับ</span>
                        )}
                      </div>

                      {res?.note && <p className="text-xs text-amber-600">หมายเหตุ: {res.note}</p>}

                      {!isLocked && (
                        <div className="border-t border-slate-100 pt-2 text-right">
                          <button
                            type="button"
                            onClick={() => openDetail("count", asset)}
                            className="rounded-lg bg-[#00786F] px-3.5 py-1.5 text-xs font-semibold text-white"
                          >
                            {res ? "แก้ไขผล" : "ตรวจนับ"}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-400">
                      <th className="pb-3 font-medium">รหัส / รายการ</th>
                      <th className="pb-3 font-medium">หมวดหมู่</th>
                      <th className="pb-3 font-medium">ผลตรวจนับ</th>
                      <th className="pb-3 font-medium">หมายเหตุ</th>
                      <th className="pb-3 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {countableAssets.map((asset) => {
                      const res = activeRound.results?.[asset.id];
                      const isLocked = activeRound.status !== "open";

                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 pr-4">
                            <div className="font-semibold text-slate-800">{asset.name}</div>
                            <div className="font-mono text-xs text-slate-400">{asset.id}</div>
                          </td>
                          <td className="py-3.5 text-slate-600">{asset.type}</td>
                          <td className="py-3.5">
                            {res ? (
                              <span
                                className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  COUNT_BADGE[res.result].style
                                }`}
                              >
                                {COUNT_BADGE[res.result].label}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-400">รอตรวจนับ</span>
                            )}
                          </td>
                          <td className="py-3.5 text-xs text-slate-500">{res?.note || "-"}</td>
                          <td className="py-3.5 text-right">
                            {!isLocked && (
                              <button
                                type="button"
                                onClick={() => openDetail("count", asset)}
                                className="rounded-lg bg-[#00786F] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#00665F]"
                              >
                                {res ? "แก้ไขผล" : "ตรวจนับ"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}

      {/* แท็บ 4: ทรัพย์สินสูญหาย */}
      {activeTab === "lost" && (
        <Card className="p-4 sm:p-6">
          {lostAssets.length === 0 ? (
            <div className="rounded-xl bg-slate-50 py-12 text-center text-sm text-slate-400">
              ไม่พบรายการทรัพย์สินสูญหายในสาขานี้
            </div>
          ) : (
            <>
              <div className="space-y-3 md:hidden">
                {lostAssets.map((asset) => {
                  const note = activeRound?.results?.[asset.id]?.note;
                  return (
                    <div
                      key={asset.id}
                      className="space-y-2.5 rounded-xl border border-purple-200 bg-purple-50/20 p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-800">{asset.name}</p>
                          <p className="font-mono text-xs text-slate-400">
                            {asset.id} · {asset.type}
                          </p>
                        </div>
                        {renderAssetStatusBadge(asset)}
                      </div>

                      {note && <p className="text-xs text-slate-600">หมายเหตุ: {note}</p>}

                      <div className="flex items-center justify-between border-t border-purple-100 pt-2">
                        <span className="text-xs font-semibold text-slate-700">
                          มูลค่า {baht(getRemainingValue(asset))}
                      </span>
                        <button
                          type="button"
                          onClick={() => openDetail("inspect", asset)}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
                        >
                          ตรวจสอบ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-400">
                      <th className="pb-3 font-medium">รหัส / รายการ</th>
                      <th className="pb-3 font-medium">หมวดหมู่</th>
                      <th className="pb-3 font-medium">มูลค่าคงเหลือ</th>
                      <th className="pb-3 font-medium">หมายเหตุ</th>
                      <th className="pb-3 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lostAssets.map((asset) => {
                      const note = activeRound?.results?.[asset.id]?.note;
                      return (
                        <tr key={asset.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 pr-4">
                            <div className="font-semibold text-slate-800">{asset.name}</div>
                            <div className="font-mono text-xs text-slate-400">{asset.id}</div>
                          </td>
                          <td className="py-3.5 text-slate-600">{asset.type}</td>
                          <td className="py-3.5 font-medium text-slate-700">
                            {baht(getRemainingValue(asset))}
                          </td>
                          <td className="py-3.5 text-xs text-slate-500">{note || "-"}</td>
                          <td className="py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => openDetail("inspect", asset)}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-[#00786F] hover:text-[#00786F]"
                            >
                              ตรวจสอบ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Card>
      )}
    </main>
  );
}

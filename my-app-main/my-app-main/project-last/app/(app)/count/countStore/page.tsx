"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { useAppData } from "@/lib/storage";
import { STORE_BRANCH_ID } from "@/lib/utils";
import { RESULT_LABEL, ROUND_LABEL } from "@/lib/labels";
import type { Asset, CountResult } from "@/lib/types";

type SavedCountEntry = {
  result: CountResult;
  note?: string;
  image?: string;
};

export default function StocktakeAssetsPage() {
  const { assets, setAssets, branches, rounds, setRoundById, ready, log } = useAppData();

  // ตัวแปรควบคุมการสลับหน้า: null = หน้าตารางตรวจนับ / มีข้อมูล = หน้าฟอร์มตรวจนับ
  const [countingAsset, setCountingAsset] = useState<Asset | null>(null);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);

  // State สำหรับฟอร์มตรวจนับ
  const [selectedResult, setSelectedResult] = useState<CountResult | "">("");
  const [note, setNote] = useState("");
  const [damageImage, setDamageImage] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [saving, setSaving] = useState(false);

  // 1. ค้นหา "สาขา 1" อัตโนมัติ (ข้ามคลังกลาง STORE_BRANCH_ID)
  const branch1 = useMemo(() => {
    return (
      branches.find(
        (b) => b.name.includes("สาขา 1") || b.name.includes("สาขา1")
      ) ||
      branches.find((b) => b.id !== STORE_BRANCH_ID) ||
      branches[0]
    );
  }, [branches]);

  const branch1Id = branch1?.id || "";

  // แสดงเฉพาะรอบที่กำหนดให้สาขานี้หรือทุกสาขา
  const branchRounds = useMemo(() => {
    const normalize = (value: string) => value.replace(/\s+/g, "").toLowerCase();
    return rounds.filter(
      (item) =>
        !item.branch ||
        normalize(item.branch) === normalize(branch1?.name ?? "") ||
        item.branch === branch1Id,
    );
  }, [branch1?.name, branch1Id, rounds]);
  const defaultRound =
    [...branchRounds].reverse().find((item) => item.status !== "closed") ??
    branchRounds[branchRounds.length - 1] ??
    null;
  const round =
    branchRounds.find((item) => item.id === selectedRoundId) ?? defaultRound;

  // 3. รายการทรัพย์สินที่ต้องตรวจนับในรอบนี้
  const branchAssetsForCount = useMemo(() => {
    if (!round) return [];

    return assets.filter(
      (item) => item.branchId === branch1Id && item.status !== "in-transit"
    );
  }, [assets, branch1Id, round]);

  // สร้าง QR Code เมื่อเปิดหน้าตรวจนับ
  useEffect(() => {
    if (!countingAsset) return;

    let active = true;
    QRCode.toDataURL(countingAsset.id, { width: 250, margin: 2 })
      .then((code) => {
        if (active) setQrCode(code);
      })
      .catch(() => {
        if (active) setQrCode("");
      });

    return () => {
      active = false;
    };
  }, [countingAsset]);

  // เปิดหน้าตรวจนับของรายการนั้น (ดึงค่าเดิมมาแสดงหากเคยตรวจนับแล้วในรอบนี้)
  const handleOpenCount = (asset: Asset) => {
    const existing = round?.results?.[asset.id] as SavedCountEntry | undefined;
    setQrCode("");
    setCountingAsset(asset);
    setSelectedResult(existing?.result ?? "");
    setNote(existing?.note ?? "");
    setDamageImage(existing?.image ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // อัปโหลดรูปภาพความชำรุด (จำกัดไม่เกิน 500 KB)
  const handleDamageImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ");
      e.target.value = "";
      return;
    }
    if (file.size > 500 * 1024) {
      alert("กรุณาเลือกรูปภาพขนาดไม่เกิน 500 KB");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDamageImage(reader.result as string);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  // บันทึกผลการตรวจนับรายชิ้น -> อัปเดตทั้ง round.results และสถานะ/รูปใน assets
  const handleSaveCount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!countingAsset || !round) return;

    if (!selectedResult) {
      alert("กรุณาระบุสถานะของทรัพย์สิน");
      return;
    }

    const isDamaged = selectedResult === "damaged";

    if (isDamaged && !note.trim()) {
      alert("กรุณาระบุหมายเหตุรายละเอียดความชำรุด");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      // แปลงผลการตรวจนับเป็นสถานะหลักของทรัพย์สินเพื่อให้หน้า branch-assets อัปเดตตามทันที
      const nextAssetStatus = (
        selectedResult === "found"
          ? "normal"
          : selectedResult === "not-found"
            ? "disposed"
            : selectedResult
      ) as Asset["status"];

      const nextAssets = assets.map((item) =>
        item.id === countingAsset.id
          ? {
              ...item,
              status: nextAssetStatus,
              // หากเลือกชำรุดและมีการแนบรูปใหม่ ให้อัปเดตรูปทรัพย์สินด้วย
              image: isDamaged && damageImage ? damageImage : item.image,
            }
          : item
      );
      setAssets(nextAssets);

      // บันทึกผลลงในรอบตรวจนับปัจจุบัน (round.results)
      const nextResults = {
        ...round.results,
        [countingAsset.id]: {
          result: selectedResult,
          note: note.trim(),
          ...(isDamaged && damageImage ? { image: damageImage } : {}),
        },
      };

      setRoundById(round.id, {
        ...round,
        results: nextResults,
      });

      log(
        "Admin",
        `ตรวจนับทรัพย์สิน ${countingAsset.id} ${countingAsset.name} (${RESULT_LABEL[selectedResult]}${note.trim() ? ` - หมายเหตุ: ${note.trim()}` : ""})`
      );

      alert(`บันทึกการตรวจนับ ${countingAsset.id} เรียบร้อยแล้ว`);
      setCountingAsset(null);
      setSelectedResult("");
      setNote("");
      setDamageImage("");
    } catch (error) {
      console.error(error);
      alert("บันทึกไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม");
    } finally {
      setSaving(false);
    }
  };

  // ส่งผลตรวจนับทั้งหมดไปที่หน้า Review 
  const handleSubmitRoundToReview = () => {
    if (!round) return;

    const countedTotal = branchAssetsForCount.filter((item) =>
      Boolean(round.results[item.id])
    ).length;

    if (countedTotal === 0) {
      alert("กรุณาตรวจนับทรัพย์สินอย่างน้อย 1 รายการก่อนส่งผลตรวจนับ");
      return;
    }

    if (countedTotal < branchAssetsForCount.length) {
      const remain = branchAssetsForCount.length - countedTotal;
      const ok = confirm(
        `ยังตรวจนับไม่ครบ (เหลืออีก ${remain} รายการ) ต้องการส่งผลตรวจนับเลยหรือไม่?`
      );
      if (!ok) return;
    } else {
      const ok = confirm(
        "ยืนยันส่งผลตรวจนับไปยังหน้าตรวจสอบผล (Review) ใช่หรือไม่?"
      );
      if (!ok) return;
    }

    setRoundById(round.id, {
      ...round,
      status: "review",
    });

    log(
      "Admin",
      `ส่งผลตรวจนับรอบ ${round.name} (${round.date}) จำนวน ${countedTotal}/${branchAssetsForCount.length} รายการ`
    );

    alert("ส่งผลตรวจนับเรียบร้อยแล้ว");
  };

  // =========================================================================
  // กรณีที่ 0 : ยังไม่มีรอบตรวจนับ
  // =========================================================================
  if (!ready || !round) {
    return (
      <main className="w-full pb-8">
        <div className="mx-auto w-full max-w-[1600px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
              📋
            </div>
            <h2 className="font-semibold text-slate-800">
              {ready ? "ยังไม่มีรอบตรวจนับ" : "กำลังโหลดข้อมูล..."}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {ready ? "กรุณากำหนดรอบตรวจนับก่อน" : "กรุณารอสักครู่"}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const isLocked = round.status !== "open";
  const isDamaged = selectedResult === "damaged";

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
  const readOnlyInputClass =
    "w-full cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none";
  const selectInputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00786F] focus:ring-4 focus:ring-teal-50";

  // =========================================================================
  // หน้าจอที่ 2 : หน้าฟอร์มตรวจนับทรัพย์สิน
  // =========================================================================
  if (countingAsset) {
    return (
      <main className="w-full pb-8">
        <div className="mx-auto w-full max-w-[1600px] space-y-5">
          <header>
            <h1 className="text-2xl font-bold text-slate-800">
              ตรวจนับทรัพย์สิน
            </h1>
          </header>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSaveCount}>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.4fr)] lg:gap-12">
                {/* ฝั่งซ้าย : ข้อมูลรายการ + เลือกสถานะ + หมายเหตุ + แนบรูปชำรุด */}
                <div className="space-y-4">
                  <h2 className="mb-5 text-lg font-bold text-slate-800">
                    ข้อมูลรายการ
                  </h2>

                  <div>
                    <label className={labelClass}>
                      รหัสทรัพย์สิน / Asset ID
                    </label>
                    <input
                      type="text"
                      value={countingAsset.id}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>ชื่อทรัพย์สิน</label>
                    <input
                      type="text"
                      value={countingAsset.name}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Vendor</label>
                    <input
                      type="text"
                      value={countingAsset.vendor}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>หมวดหมู่</label>
                    <input
                      type="text"
                      value={countingAsset.type}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>สถานะการตรวจนับ</label>
                    <select
                      value={selectedResult}
                      onChange={(e) => {
                        const val = e.target.value as CountResult;
                        setSelectedResult(val);
                        if (val !== "damaged") setDamageImage("");
                      }}
                      className={selectInputClass}
                      required
                    >
                      <option value="" disabled>
                        ระบุสถานะของทรัพย์สิน
                      </option>
                      <option value="found">ปกติ</option>
                      <option value="damaged">ชำรุด</option>
                    </select>
                  </div>

                  {/* แสดงช่องหมายเหตุเมื่อเลือกสถานะ (บังคับกรอกเมื่อเลือกชำรุด) */}
                  {selectedResult !== "" && (
                    <div>
                      <label className={labelClass}>
                        หมายเหตุ{" "}
                        {isDamaged ? (
                          <span className="text-red-500">
                            * (กรุณาระบุรายละเอียดความชำรุด)
                          </span>
                        ) : (
                          <span className="text-xs font-normal text-slate-400">
                            (ถ้ามี)
                          </span>
                        )}
                      </label>
                      <textarea
                        rows={3}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        required={isDamaged}
                        placeholder={
                          isDamaged
                            ? "ระบุอาการชำรุดหรือจุดที่เสียหาย เช่น หน้าจอแตก, เปิดไม่ติด..."
                            : "ระบุหมายเหตุเพิ่มเติม (ถ้ามี)"
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-4 focus:ring-teal-50"
                      />
                    </div>
                  )}

                  {/* แสดงช่องแนบรูปภาพเพิ่มเติมเมื่อเลือกสถานะ "ชำรุด" */}
                  {isDamaged && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                      <label className={labelClass}>
                        แนบรูปภาพความชำรุด{" "}
                        <span className="text-xs font-normal text-slate-400">
                          (รองรับขนาดไม่เกิน 500 KB)
                        </span>
                      </label>

                      {damageImage ? (
                        <div className="mt-2 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                          <img
                            src={damageImage}
                            alt="รูปภาพความชำรุด"
                            className="h-36 w-36 rounded-xl border border-slate-200 bg-white object-contain p-1.5"
                          />
                          <div className="flex flex-col gap-2">
                            <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                              เปลี่ยนรูปภาพ
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleDamageImageChange}
                                className="hidden"
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => setDamageImage("")}
                              className="text-left text-xs font-medium text-red-500 hover:underline"
                            >
                              ลบรูปภาพที่แนบ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#00786F] bg-white px-4 py-2.5 text-xs font-semibold text-[#00786F] transition hover:bg-teal-50">
                            + แนบรูปภาพความชำรุด
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleDamageImageChange}
                              className="hidden"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ปุ่มบันทึกข้อมูล & ยกเลิก */}
                  <div className="flex items-center gap-3 pt-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-[#00786F] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665F] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setCountingAsset(null)}
                      disabled={saving}
                      className="rounded-lg border border-slate-200 bg-slate-100 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-200"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>

                {/* ฝั่งขวา : รูปทรัพย์สินเดิม + QR Code */}
                <div className="flex flex-col items-start space-y-6 lg:items-center">
                  <div className="w-full max-w-[260px]">
                    <p className="mb-2 text-sm font-bold text-slate-800">
                      รูปทรัพย์สิน
                    </p>
                    {countingAsset.image ? (
                      <div className="flex h-52 w-full items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
                        <img
                          src={countingAsset.image}
                          alt={countingAsset.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-52 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                        ไม่มีรูปภาพทรัพย์สิน
                      </div>
                    )}
                  </div>

                  <div className="w-full max-w-[260px]">
                    <p className="mb-2 text-sm font-bold text-slate-800">
                      Qr code
                    </p>
                    {qrCode ? (
                      <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
                        <img
                          src={qrCode}
                          alt="QR Code"
                          className="h-44 w-44 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="flex h-48 w-full items-center justify-center rounded-xl border border-slate-200 text-xs text-slate-400">
                        กำลังสร้าง QR Code...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </section>
        </div>
      </main>
    );
  }

  // หน้าจอที่ 1 : ตารางรายการตรวจนับทรัพย์สิน
  const countedTotal = branchAssetsForCount.filter((item) =>
    Boolean(round.results[item.id])
  ).length;

  return (
    <main className="w-full pb-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        {/* ส่วนหัว */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              ตรวจนับทรัพย์สิน
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              รอบตรวจนับ:{" "}
              <span className="font-medium text-slate-700">{round.name}</span> (
              {round.date}) • สถานะ:{" "}
              <span className="font-semibold text-[#00786F]">
                {ROUND_LABEL[round.status]}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {branchRounds.length > 1 && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>เลือกรอบ</span>
                <select
                  value={round.id}
                  onChange={(event) => setSelectedRoundId(Number(event.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#00786F] focus:ring-4 focus:ring-teal-50"
                >
                  {branchRounds.map((item) => (
                    <option key={item.id} value={item.id}>
                      #{item.id} · {item.name} ({ROUND_LABEL[item.status]})
                    </option>
                  ))}
                </select>
              </label>
            )}
            <span className="rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-[#00786F]">
              ตรวจนับแล้ว {countedTotal} / {branchAssetsForCount.length} รายการ
            </span>

            {!isLocked && (
              <button
                type="button"
                onClick={handleSubmitRoundToReview}
                disabled={countedTotal === 0}
                className="rounded-lg bg-[#00786F] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#00665F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                ส่งผลตรวจนับ
              </button>
            )}
          </div>
        </header>

        {/* แถบแจ้งเตือนเมื่อส่งผลตรวจนับไปแล้ว */}
        {round.status === "review" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ส่งผลตรวจนับเรียบร้อยแล้ว ขณะนี้อยู่ระหว่างรอผู้ดูแลระบบตรวจสอบผล
          </div>
        )}

        {round.status === "closed" && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            รอบตรวจนับนี้ได้รับการตรวจสอบและปิดรอบเรียบร้อยแล้ว
          </div>
        )}

        {/* กล่องตารางใหญ่ */}
        <section className="min-h-[540px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          {branchAssetsForCount.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-sm font-medium text-slate-500">
                ไม่พบรายการทรัพย์สินในสาขาสำหรับตรวจนับ
              </p>
              <p className="mt-1 text-xs text-slate-400">
                กรุณากดยืนยันรับทรัพย์สินเข้าสาขาก่อนเริ่มตรวจนับ
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-center text-sm">
                <thead>
                  <tr className="border-b border-slate-300 text-slate-700">
                    <th className="px-4 py-3.5 font-semibold">รหัสทรัพย์สิน</th>
                    <th className="px-4 py-3.5 font-semibold">ชื่อทรัพย์สิน</th>
                    <th className="px-4 py-3.5 font-semibold">หมวดหมู่</th>
                    <th className="px-4 py-3.5 font-semibold">สถานะการตรวจนับ</th>
                    <th className="px-4 py-3.5 font-semibold">หมายเหตุ / รูปแนบ</th>
                    <th className="w-36 px-4 py-3.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchAssetsForCount.map((item) => {
                    const countEntry = round.results[item.id] as
                      | SavedCountEntry
                      | undefined;
                    const isCounted = Boolean(countEntry);

                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-slate-50/80"
                      >
                        <td className="px-4 py-4 font-medium text-slate-700">
                          {item.id}
                        </td>
                        <td className="px-4 py-4 text-slate-700">{item.name}</td>
                        <td className="px-4 py-4 text-slate-600">{item.type}</td>
                        <td className="px-4 py-4">
                          {isCounted && countEntry ? (
                            <span
                              className={`font-medium ${
                                countEntry.result === "found"
                                  ? "text-emerald-600"
                                  : "text-amber-600"
                              }`}
                            >
                              ตรวจนับเรียบร้อย ({RESULT_LABEL[countEntry.result]})
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              ยังไม่ได้ตรวจนับ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-slate-500">
                          <div className="flex items-center justify-center gap-2">
                            <span>{countEntry?.note || "-"}</span>
                            {countEntry?.image && (
                              <img
                                src={countEntry.image}
                                alt="รูปความชำรุด"
                                className="h-9 w-9 rounded-md border border-slate-200 object-contain p-0.5"
                              />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {!isLocked && (
                            <button
                              type="button"
                              onClick={() => handleOpenCount(item)}
                              className={`rounded-lg px-5 py-2 text-xs font-semibold shadow-sm transition ${
                                isCounted
                                  ? "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                  : "bg-[#00786F] text-white hover:bg-[#00665F]"
                              }`}
                            >
                              {isCounted ? "แก้ไข" : "ตรวจนับ"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
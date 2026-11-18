"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { useAppData } from "@/lib/storage";
import { STORE_BRANCH_ID } from "@/lib/utils";
import type { Asset } from "@/lib/types";

const COUNTED_STORAGE_KEY = "branch1_counted_asset_ids";

export default function StocktakeAssetsPage() {
  const { assets, setAssets, branches, log } = useAppData();

  // ตัวแปรควบคุมการสลับหน้า: null = หน้าตารางตรวจนับ / มีข้อมูล = หน้าฟอร์มตรวจนับ
  const [countingAsset, setCountingAsset] = useState<Asset | null>(null);

  // เก็บรายชื่อ ID ที่ตรวจนับเรียบร้อยแล้วในรอบนี้ (บันทึกลง localStorage ไว้กันรีเฟรชหาย)
  const [countedIds, setCountedIds] = useState<string[]>([]);

  // State สำหรับฟอร์มตรวจนับ
  const [selectedStatus, setSelectedStatus] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [saving, setSaving] = useState(false);

  // โหลดประวัติรายการที่ตรวจนับแล้วจาก localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(COUNTED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setCountedIds(parsed);
      }
    } catch {
      // ข้ามหากอ่าน localStorage ไม่ได้
    }
  }, []);

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

  // 2. กรองเฉพาะทรัพย์สินของสาขา 1 ที่รับเข้าสาขาแล้ว (ไม่ใช่ของที่กำลังจัดส่ง in-transit)
  const branchAssetsForCount = useMemo(() => {
    return assets.filter(
      (item) => item.branchId === branch1Id && item.status !== "in-transit"
    );
  }, [assets, branch1Id]);

  // สร้าง QR Code เมื่อเปิดหน้าตรวจนับ
  useEffect(() => {
    if (!countingAsset) {
      setQrCode("");
      return;
    }
    QRCode.toDataURL(countingAsset.id, { width: 250, margin: 2 })
      .then(setQrCode)
      .catch(() => setQrCode(""));
  }, [countingAsset]);

  // เปิดหน้าตรวจนับของรายการนั้น
  const handleOpenCount = (asset: Asset) => {
    setCountingAsset(asset);
    setSelectedStatus(""); // ให้ผู้ใช้กดเลือก "ระบุสถานะของทรัพย์สิน" เองตามภาพร่าง
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // บันทึกผลการตรวจนับ
  const handleSaveCount = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!countingAsset) return;

    if (!selectedStatus) {
      alert("กรุณาระบุสถานะของทรัพย์สิน");
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      // อัปเดตสถานะจริงของทรัพย์สินในระบบ
      const updatedAsset: Asset = {
        ...countingAsset,
        status: selectedStatus as Asset["status"],
      };

      const nextAssets = assets.map((item) =>
        item.id === countingAsset.id ? updatedAsset : item
      );
      setAssets(nextAssets);

      // บันทึกว่ารายการนี้ "ตรวจนับเรียบร้อย" แล้ว
      const nextCountedIds = Array.from(
        new Set([...countedIds, countingAsset.id])
      );
      setCountedIds(nextCountedIds);
      localStorage.setItem(COUNTED_STORAGE_KEY, JSON.stringify(nextCountedIds));

      log(
        "Admin",
        `ตรวจนับทรัพย์สิน ${countingAsset.id} ${countingAsset.name} (สถานะ: ${selectedStatus})`
      );

      alert(`บันทึกการตรวจนับ ${countingAsset.id} เรียบร้อยแล้ว`);
      setCountingAsset(null);
    } catch (error) {
      console.error(error);
      alert("บันทึกไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม");
    } finally {
      setSaving(false);
    }
  };

  // รีเซ็ตรอบการตรวจนับใหม่ทั้งหมด
  const handleResetRound = () => {
    if (!confirm("ต้องการเริ่มรอบตรวจนับใหม่ทั้งหมดใช่หรือไม่?")) return;
    setCountedIds([]);
    localStorage.removeItem(COUNTED_STORAGE_KEY);
  };

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
  const readOnlyInputClass =
    "w-full cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none";
  const selectInputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00786F] focus:ring-4 focus:ring-teal-50";

  // =========================================================================
  // หน้าจอที่ 2 : หน้าฟอร์มตรวจนับทรัพย์สิน (ตามภาพร่างฝั่งขวา)
  // =========================================================================
  if (countingAsset) {
    return (
      <main className="w-full pb-8">
        <div className="mx-auto w-full max-w-[1600px] space-y-5">
          {/* ส่วนหัว */}
          <header>
            <h1 className="text-2xl font-bold text-slate-800">
              ตรวจนับทรัพย์สิน
            </h1>
          </header>

          {/* กล่องใหญ่ตามภาพร่าง */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <form onSubmit={handleSaveCount}>
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,1.4fr)] lg:gap-12">
                {/* ฝั่งซ้าย : ข้อมูลรายการ + เลือกสถานะ + ปุ่มบันทึก/ยกเลิก */}
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
                    <label className={labelClass}>สถานะ</label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className={selectInputClass}
                      required
                    >
                      <option value="" disabled>
                        ระบุสถานะของทรัพย์สิน
                      </option>
                      <option value="normal">ปกติ (Normal)</option>
                      <option value="repair">ชำรุด / ส่งซ่อม</option>
                      <option value="disposed">สูญหาย / ปลดระวาง</option>
                    </select>
                  </div>

                  {/* ปุ่มบันทึกข้อมูล & ยกเลิก ใต้ช่องสถานะตามภาพร่าง */}
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

                {/* ฝั่งขวา : รูปทรัพย์สิน + QR Code ตามภาพร่าง */}
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

  // =========================================================================
  // หน้าจอที่ 1 : ตารางรายการตรวจนับทรัพย์สิน (ตามภาพร่างฝั่งซ้าย)
  // =========================================================================
  const countedTotal = branchAssetsForCount.filter((item) =>
    countedIds.includes(item.id)
  ).length;

  return (
    <main className="w-full pb-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        {/* ส่วนหัว */}
        <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold text-slate-800">
            ตรวจนับทรัพย์สิน
          </h1>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-teal-50 px-3.5 py-1.5 text-xs font-semibold text-[#00786F]">
              ตรวจนับแล้ว {countedTotal} / {branchAssetsForCount.length} รายการ
            </span>

            {countedTotal > 0 && (
              <button
                type="button"
                onClick={handleResetRound}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                เริ่มรอบตรวจนับใหม่
              </button>
            )}
          </div>
        </header>

        {/* กล่องตารางใหญ่ตามภาพร่าง */}
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
                    <th className="px-4 py-3.5 font-semibold">สถานะ</th>
                    <th className="w-36 px-4 py-3.5 font-semibold"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branchAssetsForCount.map((item) => {
                    const isCounted = countedIds.includes(item.id);

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
                          {isCounted ? (
                            <span className="font-medium text-emerald-600">
                              ตรวจนับเรียบร้อย
                            </span>
                          ) : (
                            <span className="text-slate-600">
                              ยังไม่ได้ตรวจนับ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          {!isCounted && (
                            <button
                              type="button"
                              onClick={() => handleOpenCount(item)}
                              className="rounded-lg bg-[#00786F] px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#00665F]"
                            >
                              ตรวจนับ
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
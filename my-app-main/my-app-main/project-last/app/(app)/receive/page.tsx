"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { useAppData } from "@/lib/storage";
import { STORE_BRANCH_ID } from "@/lib/utils";
import type { Asset } from "@/lib/types";
import {
  remainingValue,
  yearlyDepreciation,
  monthlyDepreciation,
  baht,
} from "@/lib/depreciation";

export default function ReceiveAssetsPage() {
  const { assets, setAssets, branches, log } = useAppData();

  // ตัวแปรควบคุมการสลับหน้า: null = หน้ารายการที่กำลังจัดส่ง / มีข้อมูล = หน้าตรวจสอบก่อนกดรับ
  const [inspectingAsset, setInspectingAsset] = useState<Asset | null>(null);

  // State สำหรับรูปภาพเพิ่มเติมตอนตรวจรับ (ถ้ามี)
  const [newImage, setNewImage] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [todayDate, setTodayDate] = useState<Date | null>(null);

useEffect(() => {
  setTodayDate(new Date());
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

  // 2. กรองเฉพาะทรัพย์สินที่ส่งมา "สาขา 1" และอยู่ในสถานะ "in-transit" (กำลังจัดส่ง)
  const incomingAssets = useMemo(() => {
    return assets.filter(
      (item) => item.branchId === branch1Id && item.status === "in-transit"
    );
  }, [assets, branch1Id]);

  // สร้าง QR Code เมื่อเปิดหน้าตรวจสอบ
  useEffect(() => {
    if (!inspectingAsset) {
      setQrCode("");
      return;
    }
    QRCode.toDataURL(inspectingAsset.id, { width: 250, margin: 2 })
      .then(setQrCode)
      .catch(() => setQrCode(""));
  }, [inspectingAsset]);

  // กดปุ่ม "ตรวจสอบ" จากรายการ
  const handleOpenInspect = (asset: Asset) => {
    setInspectingAsset(asset);
    setNewImage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // เลือกรูปภาพเพิ่มเติมตอนรับของ
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setNewImage(reader.result as string);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  // กด "ยืนยันรับทรัพย์สิน" -> เปลี่ยนสถานะเป็น normal และ received = true
  const handleConfirmReceive = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inspectingAsset) return;

    if (saving) return;
    setSaving(true);

    try {
      const receivedAsset: Asset = {
        ...inspectingAsset,
        status: "normal",
        received: true,
        // ถ้ามีการอัปโหลดรูปใหม่ตอนรับของให้ใช้รูปใหม่ ถ้าไม่มีให้คงรูปเดิมไว้
        image: newImage || inspectingAsset.image,
      };

      const nextAssets = assets.map((item) =>
        item.id === inspectingAsset.id ? receivedAsset : item
      );

      setAssets(nextAssets);
      log(
        "Admin",
        `ยืนยันรับทรัพย์สิน ${inspectingAsset.id} ${inspectingAsset.name} เข้า${branch1?.name || "สาขา 1"}`
      );

      alert(`รับทรัพย์สิน ${inspectingAsset.id} เข้าสาขาเรียบร้อยแล้ว`);
      setNewImage("");
      setInspectingAsset(null);
    } catch (error) {
      console.error(error);
      alert("บันทึกไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม");
    } finally {
      setSaving(false);
    }
  };

  const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
  const readOnlyInputClass =
    "w-full cursor-default rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none disabled:opacity-100";
  const cardClass =
    "h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";
  const titleClass = "mb-5 text-lg font-bold text-slate-800";

  // =========================================================================
  // หน้าจอที่ 2 : หน้าตรวจสอบข้อมูลก่อนกด "ยืนยันรับทรัพย์สิน"
  // =========================================================================
  if (inspectingAsset) {
    const currentValue =
    todayDate &&
    inspectingAsset.usefulLifeYears > 0 &&
    inspectingAsset.purchaseDate
    ? remainingValue(
        {
          price: inspectingAsset.price,
          purchaseDate: inspectingAsset.purchaseDate,
          usefulLifeYears: inspectingAsset.usefulLifeYears,
        },
        todayDate
      )
    : 0;
    const depreciationPerYear = yearlyDepreciation(
      inspectingAsset.price,
      inspectingAsset.usefulLifeYears
    );
    const depreciationPerMonth = monthlyDepreciation(
      inspectingAsset.price,
      inspectingAsset.usefulLifeYears
    );

    return (
      <main className="w-full pb-6">
        <div className="mx-auto w-full max-w-[1600px] space-y-5">
          {/* ส่วนหัว + ปุ่มย้อนกลับ */}
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                ตรวจสอบรายการก่อนรับเข้าสาขา
              </h1>
            </div>
          </header>

          <form onSubmit={handleConfirmReceive}>
            <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-x-6 lg:gap-y-5">
              {/* กล่องที่ 1 : ข้อมูลรายการ (Read-only ทั้งหมด) */}
              <section className={cardClass}>
                <h2 className={titleClass}>ข้อมูลรายการ</h2>

                <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>รหัสทรัพย์สิน / Asset ID</label>
                    <input
                      type="text"
                      value={inspectingAsset.id}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>ชื่อทรัพย์สิน</label>
                    <input
                      type="text"
                      value={inspectingAsset.name}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>Vendor</label>
                    <input
                      type="text"
                      value={inspectingAsset.vendor}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>หมวดหมู่</label>
                    <input
                      type="text"
                      value={inspectingAsset.type}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>สาขาปลายทาง</label>
                    <select
                      value={inspectingAsset.branchId}
                      disabled
                      className={readOnlyInputClass}
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className={labelClass}>สถานะปัจจุบัน</label>
                    <input
                      type="text"
                      value="ระหว่างจัดส่ง (รอสาขายืนยันรับ)"
                      readOnly
                      className="w-full cursor-default rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 outline-none"
                    />
                  </div>

                  <div>
                    <label className={labelClass}>ประกันถึงวันที่</label>
                    <input
                      type="text"
                      value={inspectingAsset.warrantyUntil || "ไม่มีประกัน"}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>
                </div>
              </section>

              {/* กล่องที่ 2 : รูปทรัพย์สิน (ดูรูปจากคลัง + เพิ่มรูปตอนรับของได้) */}
              <section className={cardClass}>
                <h2 className={titleClass}>รูปทรัพย์สิน</h2>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-slate-500">
                        รูปภาพที่ส่งมาจากคลัง
                      </p>
                      {inspectingAsset.image ? (
                        <img
                          src={inspectingAsset.image}
                          alt="รูปทรัพย์สินเดิม"
                          className="h-44 w-full rounded-xl border border-slate-200 bg-slate-50 object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
                          ไม่มีรูปภาพแนบมา
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-1.5 text-xs font-medium text-[#00786F]">
                        รูปภาพเพิ่มเติมตอนรับของ (ถ้ามี)
                      </p>
                      {newImage ? (
                        <img
                          src={newImage}
                          alt="รูปทรัพย์สินใหม่"
                          className="h-44 w-full rounded-xl border-2 border-[#00786F] bg-white object-contain p-2"
                        />
                      ) : (
                        <div className="flex h-44 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-xs text-slate-400">
                          ยังไม่ได้เลือกรูปใหม่
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <label className="cursor-pointer rounded-xl border border-[#00786F] bg-white px-4 py-2 text-sm font-semibold text-[#00786F] transition hover:bg-teal-50">
                      + เพิ่มรูปภาพตอนรับของ
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>

                    {newImage && (
                      <button
                        type="button"
                        onClick={() => setNewImage("")}
                        className="text-sm font-medium text-red-500 hover:text-red-700"
                      >
                        ยกเลิกรูปที่เลือก
                      </button>
                    )}
                  </div>
                </div>
              </section>

              {/* กล่องที่ 3 : ค่าเสื่อมราคา */}
              <section className={cardClass}>
                <h2 className={titleClass}>ข้อมูลค่าเสื่อมราคา</h2>

                <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>ราคาซื้อ (บาท)</label>
                    <input
                      type="text"
                      value={baht(inspectingAsset.price)}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>วันที่ซื้อ</label>
                    <input
                      type="date"
                      value={inspectingAsset.purchaseDate}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>

                  <div>
                    <label className={labelClass}>อายุการใช้งาน (ปี)</label>
                    <input
                      type="text"
                      value={`${inspectingAsset.usefulLifeYears} ปี`}
                      readOnly
                      className={readOnlyInputClass}
                    />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="text-sm text-slate-500">ค่าเสื่อมราคาต่อปี</p>
                    <p className="mt-2 text-lg font-bold text-slate-800">
                      {baht(depreciationPerYear)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="text-sm text-slate-500">ค่าเสื่อมราคาต่อเดือน</p>
                    <p className="mt-2 text-lg font-bold text-slate-800">
                      {baht(depreciationPerMonth)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="text-sm text-slate-500">มูลค่าคงเหลือปัจจุบัน</p>
                    <p className="mt-2 text-lg font-bold text-slate-800">
                      {baht(currentValue)}
                    </p>
                  </div>
                </div>
              </section>

              {/* กล่องที่ 4 : QR Code */}
              <section className={cardClass}>
                <h2 className={titleClass}>QR Code</h2>

                {qrCode ? (
                  <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-5">
                    <img
                      src={qrCode}
                      alt="QR Code"
                      className="h-44 w-44 rounded-lg object-contain"
                    />
                    <p className="mt-3 text-sm font-semibold text-slate-700">
                      {inspectingAsset.id}
                    </p>
                  </div>
                ) : (
                  <p className="py-10 text-center text-sm text-slate-400">
                    กำลังสร้าง QR Code...
                  </p>
                )}
              </section>
            </div>

            {/* ปุ่มดำเนินการด้านล่าง */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setInspectingAsset(null)}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                ย้อนกลับ
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-[#00786F] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665F] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "ยืนยันรับทรัพย์สิน"}
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // =========================================================================
  // หน้าจอที่ 1 : รายการทรัพย์สินที่กำลังเข้าสู่สาขา (ตามภาพร่าง)
  // =========================================================================
  return (
    <main className="w-full pb-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        {/* ส่วนหัว */}
        <header>
          <h1 className="text-2xl font-bold text-slate-800">รับทรัพย์สิน</h1>
        </header>

        {/* กล่องใหญ่ตามภาพร่าง */}
        <section className="min-h-[540px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">
              ทรัพย์สินที่กำลังเข้าสู่สาขาคุณ
            </h2>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-[#00786F]">
              รอตรวจรับ {incomingAssets.length} รายการ
            </span>
          </div>

          {incomingAssets.length === 0 ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
              <p className="text-sm font-medium text-slate-500">
                ไม่มีรายการทรัพย์สินที่กำลังจัดส่งมาที่สาขานี้
              </p>
              <p className="mt-1 text-xs text-slate-400">
                เมื่อคลังกลางเพิ่มรายการส่งมายังสาขา ข้อมูลจะแสดงที่นี่
              </p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {incomingAssets.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 transition hover:border-[#00786F]/50 hover:bg-slate-50/60 sm:flex-row sm:items-center"
                >
                  {/* ฝั่งซ้าย: รหัสทรัพย์สิน + รหัส + ชื่อรายการ */}
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
                    <span className="text-sm font-bold text-slate-800">
                      รหัสทรัพย์สิน
                    </span>
                    <span className="text-sm font-medium text-slate-700">
                      {item.id}
                    </span>
                    <span className="text-sm text-slate-400">
                      ({item.name} • {item.type})
                    </span>
                  </div>

                  {/* ฝั่งขวา: ปุ่มตรวจสอบ */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(item)}
                      className="rounded-lg bg-[#00786F] px-5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#00665F]"
                    >
                      ตรวจสอบ
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

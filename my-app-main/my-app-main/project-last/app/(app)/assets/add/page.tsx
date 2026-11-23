
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { useAppData } from "@/lib/storage";
import { nextAssetId, STORE_BRANCH_ID } from "@/lib/utils";
import { sampleAssets } from "@/lib/sampleData";
import type { Asset } from "@/lib/types";

import {
  remainingValue,
  yearlyDepreciation,
  monthlyDepreciation,
  baht,
} from "@/lib/depreciation";

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function calculateWarrantyDate(
  purchaseDate: string,
  durationText: string,
  unit: string
): string {
  if (!purchaseDate || !durationText.trim()) return "";

  const duration = Number(durationText);

  if (!Number.isInteger(duration) || duration < 1) return "";

  const [year, month, day] = purchaseDate.split("-").map(Number);

  if (!year || !month || !day) return "";

  let resultDate: Date;

  if (unit === "วัน") {
    resultDate = new Date(year, month - 1, day);
    resultDate.setDate(resultDate.getDate() + duration);
  } else if (unit === "เดือน") {
    const targetMonth = month - 1 + duration;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;

    const lastDay = new Date(
      targetYear,
      normalizedMonth + 1,
      0
    ).getDate();

    resultDate = new Date(
      targetYear,
      normalizedMonth,
      Math.min(day, lastDay)
    );
  } else if (unit === "ปี") {
    const targetYear = year + duration;

    const lastDay = new Date(
      targetYear,
      month,
      0
    ).getDate();

    resultDate = new Date(
      targetYear,
      month - 1,
      Math.min(day, lastDay)
    );
  } else {
    return "";
  }

  return [
    resultDate.getFullYear(),
    String(resultDate.getMonth() + 1).padStart(2, "0"),
    String(resultDate.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function AddAssetPage() {
  const router = useRouter();

  const {
    assets,
    setAssets,
    branches,
    log,
    vendors,
    ready,
  } = useAppData();

  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("IT");
  const [branchId, setBranchId] = useState(STORE_BRANCH_ID);

  const [warrantyDuration, setWarrantyDuration] = useState("");
  const [warrantyUnit, setWarrantyUnit] = useState("ปี");

  const [todayDate, setTodayDate] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const [price, setPrice] = useState("0");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");

  // เริ่มต้นด้วยรูปว่างเสมอ ไม่ดึงรูปจากทรัพย์สินเก่า
  const [image, setImage] = useState("");
  const [qrCode, setQrCode] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const now = new Date();
    const dateString = getTodayDate();

    setTodayDate(dateString);
    setCurrentDate(now);
    setPurchaseDate(dateString);

    // ล้างข้อมูลฟอร์มเมื่อเข้าหน้าเพิ่มทรัพย์สิน
    setName("");
    setVendor("");
    setCategory("IT");
    setBranchId(STORE_BRANCH_ID);
    setWarrantyDuration("");
    setWarrantyUnit("ปี");
    setPrice("0");
    setUsefulLifeYears("5");
    setImage("");
    setQrCode("");
    setSaving(false);
  }, []);

  const vendorOptions = [
    ...new Set(
      [
        ...sampleAssets.map((asset) => asset.vendor),
        ...assets.map((asset) => asset.vendor),
        ...vendors.map((item) => item.name),
      ].filter(
        (value): value is string =>
          typeof value === "string" && value.trim() !== ""
      )
    ),
  ];

  const selectedVendor = vendors.find(
    (item) => item.name === vendor
  );

  const assetId = nextAssetId(assets);

  const warrantyUntil = calculateWarrantyDate(
    purchaseDate,
    warrantyDuration,
    warrantyUnit
  );

  const currentPrice = Number(price) || 0;
  const currentLife = Number(usefulLifeYears) || 0;

  const currentValue =
    currentLife > 0 && purchaseDate && currentDate
      ? remainingValue(
          {
            price: currentPrice,
            purchaseDate,
            usefulLifeYears: currentLife,
          },
          currentDate
        )
      : 0;

  const depreciationPerYear = yearlyDepreciation(
    currentPrice,
    currentLife
  );

  const depreciationPerMonth = monthlyDepreciation(
    currentPrice,
    currentLife
  );

  // สร้าง QR Code ของรายการใหม่
  useEffect(() => {
    if (!assetId) return;

    let active = true;

    QRCode.toDataURL(assetId, {
      width: 250,
      margin: 2,
    })
      .then((url) => {
        if (active) setQrCode(url);
      })
      .catch(() => {
        if (active) setQrCode("");
      });

    return () => {
      active = false;
    };
  }, [assetId]);

  // เลือกรูปภาพของรายการใหม่
  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
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
      if (typeof reader.result === "string") {
        setImage(reader.result);
      }
    };

    reader.onerror = () => {
      alert("ไม่สามารถอ่านไฟล์รูปภาพได้");
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ล้างข้อมูลและกลับหน้ารายการ โดยไม่บันทึก
  const handleCancel = () => {
    if (saving) return;

    setName("");
    setVendor("");
    setCategory("IT");
    setBranchId(STORE_BRANCH_ID);
    setWarrantyDuration("");
    setWarrantyUnit("ปี");
    setPrice("0");
    setUsefulLifeYears("5");
    setImage("");
    setQrCode("");

    router.replace("/assets");
  };

  // บันทึกทรัพย์สินใหม่
  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (saving) return;

    if (!name.trim()) {
      alert("กรุณากรอกชื่อทรัพย์สิน");
      return;
    }

    if (!vendor.trim()) {
      alert("กรุณาเลือกผู้จำหน่าย");
      return;
    }

    if (
      price.trim() === "" ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      alert("กรุณากรอกราคาซื้อให้ถูกต้อง");
      return;
    }

    if (
      !purchaseDate ||
      !todayDate ||
      purchaseDate > todayDate
    ) {
      alert("วันที่ซื้อไม่ถูกต้องหรือเป็นวันที่ในอนาคต");
      return;
    }

    if (
      warrantyDuration.trim() !== "" &&
      (
        !Number.isInteger(Number(warrantyDuration)) ||
        Number(warrantyDuration) < 1
      )
    ) {
      alert("กรุณากรอกระยะเวลารับประกันให้ถูกต้อง");
      return;
    }

    if (
      warrantyDuration.trim() !== "" &&
      !warrantyUntil
    ) {
      alert("ไม่สามารถคำนวณวันหมดประกันได้");
      return;
    }

    if (
      usefulLifeYears.trim() === "" ||
      !Number.isInteger(Number(usefulLifeYears)) ||
      Number(usefulLifeYears) < 1 ||
      Number(usefulLifeYears) > 100
    ) {
      alert("กรุณากำหนดอายุการใช้งาน 1-100 ปี");
      return;
    }

    setSaving(true);

    try {
      const newAsset: Asset = {
        id: assetId,
        name: name.trim(),
        type: category,
        price: Number(price),
        purchaseDate,
        vendor: vendor.trim(),
        warrantyUntil,
        usefulLifeYears: Number(usefulLifeYears),
        branchId,
        status: "in-transit",
        received: false,

        // เก็บเฉพาะรูปที่เลือกในฟอร์มรายการใหม่นี้
        image: image || undefined,
      };

      setAssets((prev) => {
        // ป้องกันรหัสซ้ำ
        if (prev.some((asset) => asset.id === newAsset.id)) {
          return prev;
        }

        return [...prev, newAsset];
      });

      log(
        "Admin",
        `เพิ่มทรัพย์สิน ${assetId} ${newAsset.name}`
      );

      // กลับหน้ารายการทรัพย์สินหลังบันทึก
      router.replace("/assets");
      router.refresh();
    } catch (error) {
      console.error("Add asset error:", error);
      alert("บันทึกไม่สำเร็จ กรุณาลองใหม่");
      setSaving(false);
    }
  };

  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-4 focus:ring-teal-50";

  const cardClass =
    "h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

  const titleClass =
    "mb-5 text-lg font-bold text-slate-800";

  if (!ready || !todayDate) {
    return (
      <main className="p-8 text-center text-slate-500">
        กำลังโหลดข้อมูล...
      </main>
    );
  }

  return (
    <main className="-mt-2 min-h-screen w-full bg-white px-4 pt-0 pb-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">

        <header>
          <h1 className="text-2xl font-bold text-slate-800">
            เพิ่มทรัพย์สิน
          </h1>
        </header>

        <form onSubmit={handleSave}>
          <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-x-6 lg:gap-y-5">

            {/* ข้อมูลรายการ */}
            <section className={cardClass}>
              <h2 className={titleClass}>ข้อมูลรายการ</h2>

              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">

                <div>
                  <label className={labelClass}>
                    รหัสทรัพย์สิน / Asset ID
                  </label>
                  <input
                    type="text"
                    value={assetId}
                    readOnly
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    ชื่อทรัพย์สิน
                  </label>
                  <input
                    type="text"
                    placeholder="กรอกชื่อทรัพย์สิน"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                {/* ผู้จำหน่าย */}
                <div className="sm:col-span-2">
                  <label className={labelClass}>
                    ผู้จำหน่าย
                  </label>

                  <select
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">
                      -- เลือกผู้จำหน่าย --
                    </option>

                    {vendorOptions.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>

                  {vendor && (
                    <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100">
                          <span className="text-lg">🏢</span>
                        </div>

                        <div>
                          <p className="text-xs text-slate-500">
                            ข้อมูลผู้จำหน่ายที่เลือก
                          </p>
                          <p className="font-bold text-slate-800">
                            {selectedVendor?.name || vendor}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <p className="text-xs text-slate-500">
                            เบอร์โทรศัพท์
                          </p>
                          <p className="text-sm font-medium text-slate-700">
                            {selectedVendor?.phone || "-"}
                          </p>
                        </div>

                        <div className="sm:col-span-2">
                          <p className="text-xs text-slate-500">
                            ที่อยู่
                          </p>
                          <p className="text-sm font-medium text-slate-700">
                            {selectedVendor?.address || "-"}
                          </p>
                        </div>
                      </div>

                      {!selectedVendor && (
                        <p className="mt-3 text-xs text-slate-400">
                          ผู้จำหน่ายรายนี้ยังไม่มีรายละเอียดเพิ่มเติม
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* ประเภท */}
                <div>
                  <label className={labelClass}>ประเภท</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="IT">IT</option>
                    <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
                    <option value="อุปกรณ์สำนักงาน">อุปกรณ์สำนักงาน</option>
                    <option value="อื่น ๆ">อื่น ๆ</option>
                  </select>
                </div>

                {/* สาขา */}
                <div>
                  <label className={labelClass}>ส่งไปยังสาขา</label>
                  <select
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className={inputClass}
                    required
                  >
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ระยะเวลารับประกัน */}
                <div>
                  <label className={labelClass}>
                    ระยะเวลารับประกัน
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={warrantyDuration}
                      onChange={(e) => setWarrantyDuration(e.target.value)}
                      placeholder="กรอกระยะเวลา"
                      className={inputClass}
                    />

                    <select
                      value={warrantyUnit}
                      onChange={(e) => setWarrantyUnit(e.target.value)}
                      className={`${inputClass} max-w-[110px]`}
                    >
                      <option value="วัน">วัน</option>
                      <option value="เดือน">เดือน</option>
                      <option value="ปี">ปี</option>
                    </select>
                  </div>
                </div>

                {/* วันหมดประกัน */}
                <div>
                  <label className={labelClass}>
                    ประกันถึงวันที่
                  </label>
                  <input
                    type="date"
                    value={warrantyUntil}
                    readOnly
                    className={`${inputClass} bg-slate-50`}
                  />
                  <p className="mt-1 text-xs text-teal-600">
                    คำนวณอัตโนมัติจากวันที่ซื้อและระยะเวลาประกัน
                  </p>
                </div>
              </div>
            </section>

            {/* รูปทรัพย์สิน */}
            <section className={cardClass}>
              <h2 className={titleClass}>รูปทรัพย์สิน</h2>

              <div className="flex flex-col items-center gap-4">
                {image ? (
                  <img
                    src={image}
                    alt="รูปทรัพย์สินรายการใหม่"
                    className="h-52 w-full max-w-[320px] rounded-xl border border-slate-200 bg-white object-contain p-2"
                  />
                ) : (
                  <div className="flex h-52 w-full max-w-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
                    ยังไม่มีรูปภาพทรัพย์สิน
                  </div>
                )}

                <div className="flex items-center justify-center gap-3">
                  <label className="cursor-pointer rounded-xl bg-[#00786F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#00665F]">
                    เลือกรูปภาพ
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>

                  {image && (
                    <button
                      type="button"
                      onClick={() => setImage("")}
                      className="text-sm font-medium text-red-500 hover:text-red-700"
                    >
                      ลบรูปภาพ
                    </button>
                  )}
                </div>

                <p className="text-center text-xs text-slate-400">
                  รองรับรูปภาพขนาดไม่เกิน 500 KB
                </p>
              </div>
            </section>

            {/* ค่าเสื่อมราคา */}
            <section className={cardClass}>
              <h2 className={titleClass}>
                กำหนดค่าเสื่อมราคา
              </h2>

              <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>
                    ราคาซื้อ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>วันที่ซื้อ</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    max={todayDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className={labelClass}>
                    อายุการใช้งาน (ปี)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={usefulLifeYears}
                    onChange={(e) => setUsefulLifeYears(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    ค่าเสื่อมราคาต่อปี
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-800">
                    {baht(depreciationPerYear)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    ค่าเสื่อมราคาต่อเดือน
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-800">
                    {baht(depreciationPerMonth)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">
                    มูลค่าคงเหลือปัจจุบัน
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-800">
                    {baht(currentValue)}
                  </p>
                </div>
              </div>
            </section>

            {/* QR Code */}
            <section className={cardClass}>
              <h2 className={titleClass}>QR Code ทรัพย์สิน</h2>

              {qrCode ? (
                <div className="mx-auto flex w-full max-w-[320px] flex-col items-center rounded-xl border border-slate-200 bg-white p-5">
                  <img
                    src={qrCode}
                    alt="QR Code ทรัพย์สิน"
                    className="h-44 w-44 object-contain"
                  />
                  <p className="mt-3 text-sm font-bold text-slate-800">
                    {assetId}
                  </p>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  กำลังสร้าง QR Code...
                </p>
              )}
            </section>
          </div>

          {/* ปุ่มดำเนินการ */}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              disabled={saving || !ready}
              className="rounded-xl bg-[#00786F] px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665F] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกข้อมูล"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

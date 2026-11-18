
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

import { KEYS, useAppData } from "@/lib/storage";
import { sampleAssets } from "@/lib/sampleData";

import {
  remainingValue,
  yearlyDepreciation,
  baht,
} from "@/lib/depreciation";

// คำนวณวันหมดประกัน
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
    resultDate = new Date(Date.UTC(year, month - 1, day));
    resultDate.setUTCDate(resultDate.getUTCDate() + duration);
  } else if (unit === "เดือน") {
    const targetMonth = month - 1 + duration;
    const targetYear = year + Math.floor(targetMonth / 12);
    const normalizedMonth = targetMonth % 12;

    const lastDay = new Date(
      Date.UTC(targetYear, normalizedMonth + 1, 0)
    ).getUTCDate();

    resultDate = new Date(
      Date.UTC(targetYear, normalizedMonth, Math.min(day, lastDay))
    );
  } else if (unit === "ปี") {
    const targetYear = year + duration;

    const lastDay = new Date(
      Date.UTC(targetYear, month, 0)
    ).getUTCDate();

    resultDate = new Date(
      Date.UTC(targetYear, month - 1, Math.min(day, lastDay))
    );
  } else {
    return "";
  }

  return [
    resultDate.getUTCFullYear(),
    String(resultDate.getUTCMonth() + 1).padStart(2, "0"),
    String(resultDate.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export default function EditAssetPage() {
  const router = useRouter();

  const {
    assets,
    setAssets,
    branches,
    vendors,
    ready,
    log,
  } = useAppData();

  const [assetId, setAssetId] = useState("");
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("คอมพิวเตอร์");
  const [branchId, setBranchId] = useState("");
  const [received, setReceived] = useState(false);

  // วันที่ปัจจุบัน
  const [todayDate, setTodayDate] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  // ระยะเวลารับประกัน
  const [warrantyDuration, setWarrantyDuration] = useState("");
  const [warrantyUnit, setWarrantyUnit] = useState("ปี");

  // วันหมดประกันเดิมจากข้อมูล
  const [originalWarrantyUntil, setOriginalWarrantyUntil] =
    useState("");

  // ข้อมูลราคาและค่าเสื่อม
  const [price, setPrice] = useState("0");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");

  const [image, setImage] = useState("");
  const [qrCode, setQrCode] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  // กำหนดวันที่ปัจจุบันหลัง Component โหลด
  useEffect(() => {
    const now = new Date();

    setCurrentDate(now);
    setTodayDate(now.toISOString().slice(0, 10));
  }, []);

  // คำนวณวันหมดประกัน
  const calculatedWarrantyUntil = calculateWarrantyDate(
    purchaseDate,
    warrantyDuration,
    warrantyUnit
  );

  const warrantyUntil = warrantyDuration.trim()
    ? calculatedWarrantyUntil
    : originalWarrantyUntil;

  // รวมรายชื่อผู้จำหน่าย
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

  // ค้นหารายละเอียดผู้จำหน่าย
  const selectedVendor = vendors.find(
    (item) => item.name === vendor
  );

  // โหลดข้อมูลทรัพย์สินจาก assets ก่อน
  // ถ้าไม่พบจึงค้นหาจาก sampleAssets
  useEffect(() => {
    if (!ready || loaded || !todayDate) return;

    const selectedId = localStorage.getItem(KEYS.selectedAsset);

    if (!selectedId) {
      alert("กรุณาเลือกทรัพย์สินที่ต้องการแก้ไข");
      router.push("/assets");
      return;
    }

    const asset =
      assets.find((item) => item.id === selectedId) ||
      sampleAssets.find((item) => item.id === selectedId);

    if (!asset) {
      alert("ไม่พบข้อมูลทรัพย์สิน");
      router.push("/assets");
      return;
    }

    setAssetId(asset.id);
    setName(asset.name);
    setVendor(asset.vendor);
    setCategory(asset.type);
    setBranchId(asset.branchId);
    setReceived(asset.received);

    // วันหมดประกันจากข้อมูลเดิม
    setOriginalWarrantyUntil(asset.warrantyUntil || "");

    // ยังไม่มีข้อมูลระยะเวลาประกันในหลังบ้าน
    setWarrantyDuration("");
    setWarrantyUnit("ปี");

    // ดึงข้อมูลราคาและค่าเสื่อมจากทรัพย์สินจริง
    setPrice(String(asset.price ?? 0));
    setPurchaseDate(asset.purchaseDate || todayDate);
    setUsefulLifeYears(String(asset.usefulLifeYears ?? 5));

    setImage(asset.image ?? "");

    setLoaded(true);
  }, [ready, loaded, assets, router, todayDate]);

  // สร้าง QR Code
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

  // คำนวณค่าเสื่อมราคา
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

  // เลือกรูปภาพ
  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ");
      event.target.value = "";
      return;
    }

    if (file.size > 500 * 1024) {
      alert("รูปภาพต้องมีขนาดไม่เกิน 500 KB");
      event.target.value = "";
      return;
    }

    const reader = new FileReader();

    reader.onload = () => setImage(String(reader.result));

    reader.readAsDataURL(file);
  }

  // บันทึกข้อมูล
  function handleSave() {
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
      !Number.isInteger(Number(usefulLifeYears)) ||
      Number(usefulLifeYears) < 1 ||
      Number(usefulLifeYears) > 100
    ) {
      alert("อายุการใช้งานต้องเป็นจำนวนเต็ม 1-100 ปี");
      return;
    }

    if (
      !purchaseDate ||
      !todayDate ||
      purchaseDate > todayDate
    ) {
      alert("วันที่ซื้อไม่สามารถเป็นวันในอนาคตได้");
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
      !calculatedWarrantyUntil
    ) {
      alert("ไม่สามารถคำนวณวันหมดประกันได้");
      return;
    }

    if (saving) return;

    setSaving(true);

    try {
      const nextWarrantyUntil = warrantyDuration.trim()
        ? calculatedWarrantyUntil
        : originalWarrantyUntil;

      // ข้อมูลที่แก้ไข
      const updatedAsset = {
        name: name.trim(),
        vendor: vendor.trim(),
        type: category,
        branchId,
        price: Number(price),
        purchaseDate,
        warrantyUntil: nextWarrantyUntil || "",
        usefulLifeYears: Number(usefulLifeYears),
        image: image || undefined,
      };

      // ตรวจสอบว่ามีทรัพย์สินใน assets อยู่แล้วหรือไม่
      const existingAsset = assets.find(
        (asset) => asset.id === assetId
      );

      if (existingAsset) {
        // ถ้ามีแล้ว ให้อัปเดตข้อมูลเดิม
        setAssets(
          assets.map((asset) =>
            asset.id === assetId
              ? {
                  ...asset,
                  ...updatedAsset,
                }
              : asset
          )
        );
      } else {
        // ถ้ายังไม่มี ให้ดึงข้อมูลจาก sampleAssets มาเพิ่ม
        const sampleAsset = sampleAssets.find(
          (asset) => asset.id === assetId
        );

        if (!sampleAsset) {
          alert("ไม่พบข้อมูลทรัพย์สินที่ต้องการบันทึก");
          setSaving(false);
          return;
        }

        setAssets([
          ...assets,
          {
            ...sampleAsset,
            ...updatedAsset,
          },
        ]);
      }

      log("Admin", `แก้ไขทรัพย์สิน ${assetId}`);

      alert("แก้ไขข้อมูลทรัพย์สินสำเร็จ");
      router.push("/assets");
    } catch (error) {
      console.error(error);
      alert("ไม่สามารถบันทึกข้อมูลได้");
      setSaving(false);
    }
  }

  // รูปแบบส่วนต่าง ๆ
  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-4 focus:ring-teal-50 disabled:bg-slate-50 disabled:text-slate-400";

  const cardClass =
    "flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

  const titleClass =
    "mb-5 text-lg font-bold text-slate-800";

  // กำลังโหลด
  if (!ready || !loaded) {
    return (
      <main className="w-full pb-4">
        <div className="mx-auto w-full max-w-[1600px] rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          กำลังโหลดข้อมูลทรัพย์สิน...
        </div>
      </main>
    );
  }

  return (
    <main className="w-full pb-4">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">

        {/* ส่วนหัว */}
        <header className="-ml-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            แก้ไขข้อมูลทรัพย์สิน
          </h1>

          <span className="inline-flex w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {assetId}
          </span>
        </header>

        {/* เนื้อหาหลัก */}
        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-x-6 lg:gap-y-5">

          {/* กล่องที่ 1 : ข้อมูลทั่วไป */}
          <section className={cardClass}>
            <h2 className={titleClass}>ข้อมูลทั่วไป</h2>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">

              <div>
                <label className={labelClass}>
                  รหัสทรัพย์สิน
                </label>

                <input
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
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="กรอกชื่อทรัพย์สิน"
                  className={inputClass}
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
                >
                  <option value="">
                    -- เลือกผู้จำหน่าย --
                  </option>

                  {vendorOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
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
                        ผู้จำหน่ายรายนี้มาจากข้อมูลทรัพย์สินเดิม
                        ยังไม่มีรายละเอียดเพิ่มเติมในหน้า Vendor
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* หมวดหมู่ */}
              <div>
                <label className={labelClass}>
                  หมวดหมู่
                </label>

                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputClass}
                >
                  <option value="คอมพิวเตอร์">คอมพิวเตอร์</option>
                  <option value="อุปกรณ์สำนักงาน">อุปกรณ์สำนักงาน</option>
                  <option value="อุปกรณ์คอมพิวเตอร์">อุปกรณ์คอมพิวเตอร์</option>
                  <option value="เฟอร์นิเจอร์">เฟอร์นิเจอร์</option>
                  <option value="อื่น ๆ">อื่น ๆ</option>

                  {![
                    "คอมพิวเตอร์",
                    "อุปกรณ์สำนักงาน",
                    "อุปกรณ์คอมพิวเตอร์",
                    "เฟอร์นิเจอร์",
                    "อื่น ๆ",
                  ].includes(category) && (
                    <option value={category}>
                      {category}
                    </option>
                  )}
                </select>
              </div>

              {/* สาขา */}
              <div>
                <label className={labelClass}>
                  สาขา
                </label>

                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  disabled={received}
                  className={inputClass}
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                {received && (
                  <p className="mt-1 text-xs text-slate-400">
                    ทรัพย์สินที่สาขารับแล้ว เปลี่ยนสาขาได้ที่เมนู
                    "บันทึกการย้าย"
                  </p>
                )}
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
                    onChange={(e) =>
                      setWarrantyDuration(e.target.value)
                    }
                    placeholder="กรอกระยะเวลา"
                    className={inputClass}
                  />

                  <select
                    value={warrantyUnit}
                    onChange={(e) =>
                      setWarrantyUnit(e.target.value)
                    }
                    className={`${inputClass} max-w-[110px]`}
                  >
                    <option value="วัน">วัน</option>
                    <option value="เดือน">เดือน</option>
                    <option value="ปี">ปี</option>
                  </select>
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  เว้นว่างหากไม่มีข้อมูลระยะเวลารับประกัน
                </p>
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
                  คำนวณอัตโนมัติเมื่อกรอกระยะเวลารับประกัน
                </p>
              </div>

            </div>
          </section>

          {/* กล่องที่ 2 : รูปภาพ */}
          <section className={cardClass}>
            <h2 className={titleClass}>รูปภาพทรัพย์สิน</h2>

            <div className="flex flex-1 flex-col items-center justify-center gap-4">

              {image ? (
                <img
                  src={image}
                  alt="รูปทรัพย์สิน"
                  className="h-52 w-full max-w-[320px] rounded-xl border border-slate-200 bg-white object-contain p-2"
                />
              ) : (
                <div className="flex h-52 w-full max-w-[320px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-sm text-slate-400">
                  ยังไม่มีรูปภาพทรัพย์สิน
                </div>
              )}

              <div className="flex flex-wrap items-center justify-center gap-3">

                <label className="cursor-pointer rounded-xl bg-[#00786F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00665F]">
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
                    className="rounded-xl border border-red-200 px-5 py-3 text-sm font-medium text-red-500 transition hover:bg-red-50"
                  >
                    ลบรูปภาพ
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                รองรับรูปภาพขนาดไม่เกิน 500 KB
              </p>
            </div>
          </section>

          {/* กล่องที่ 3 : ค่าเสื่อมราคา */}
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
                  placeholder="กรอกราคาซื้อ"
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>
                  วันที่ซื้อ
                </label>

                <input
                  type="date"
                  value={purchaseDate}
                  max={todayDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>
                  อายุการใช้งาน (ปี)
                </label>

                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={usefulLifeYears}
                  onChange={(e) =>
                    setUsefulLifeYears(e.target.value)
                  }
                  className={inputClass}
                />
              </div>

            </div>

            {/* สรุปค่าเสื่อม */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">

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
                  มูลค่าคงเหลือปัจจุบัน
                </p>

                <p className="mt-2 text-lg font-bold text-[#00786F]">
                  {baht(currentValue)}
                </p>
              </div>

            </div>
          </section>

          {/* กล่องที่ 4 : QR Code */}
          <section className={cardClass}>
            <h2 className={titleClass}>
              QR Code ทรัพย์สิน
            </h2>

            <div className="flex flex-1 flex-col items-center justify-center">

              {qrCode ? (
                <div className="flex w-full max-w-[320px] flex-col items-center rounded-xl border border-slate-200 bg-white p-5">
                  <img
                    src={qrCode}
                    alt="QR Code"
                    className="h-48 w-48 rounded-lg object-contain"
                  />

                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    {assetId}
                  </p>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-slate-400">
                  กำลังสร้าง QR Code...
                </p>
              )}
            </div>
          </section>

        </div>

        {/* ปุ่มดำเนินการ */}
        <div className="flex justify-end gap-3 pt-1">

          <button
            type="button"
            onClick={() => router.push("/assets")}
            disabled={saving}
            className="h-12 rounded-xl border border-slate-200 bg-white px-6 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-12 rounded-xl bg-[#00786F] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
          </button>

        </div>
      </div>
    </main>
  );
}

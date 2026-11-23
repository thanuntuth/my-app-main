
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

// บีบอัดรูปภาพก่อนบันทึก
function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxSize = 900;

        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("ไม่สามารถประมวลผลรูปภาพได้"));
          return;
        }

        context.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.65));
      };

      img.onerror = () => reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
      img.src = reader.result as string;
    };

    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
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

  const [requestedAssetId, setRequestedAssetId] = useState<string | null>(null);

  const [assetId, setAssetId] = useState("");
  const [name, setName] = useState("");
  const [vendor, setVendor] = useState("");
  const [category, setCategory] = useState("คอมพิวเตอร์");
  const [branchId, setBranchId] = useState("");
  const [received, setReceived] = useState(false);

  const [todayDate, setTodayDate] = useState("");
  const [currentDate, setCurrentDate] = useState<Date | null>(null);

  const [warrantyDuration, setWarrantyDuration] = useState("");
  const [warrantyUnit, setWarrantyUnit] = useState("ปี");
  const [originalWarrantyUntil, setOriginalWarrantyUntil] = useState("");

  const [price, setPrice] = useState("0");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [usefulLifeYears, setUsefulLifeYears] = useState("5");

  const [image, setImage] = useState("");
  const [qrCode, setQrCode] = useState("");

  const [loadedAssetId, setLoadedAssetId] = useState("");
  const [saving, setSaving] = useState(false);

  // อ่าน ID จาก URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setRequestedAssetId(params.get("id") || "");
  }, []);

  // วันที่ปัจจุบัน
  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    setTodayDate(now.toISOString().slice(0, 10));
  }, []);

  const calculatedWarrantyUntil = calculateWarrantyDate(
    purchaseDate,
    warrantyDuration,
    warrantyUnit
  );

  const warrantyUntil = warrantyDuration.trim()
    ? calculatedWarrantyUntil
    : originalWarrantyUntil;

  // รายชื่อผู้จำหน่าย
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

  const selectedVendor = vendors.find((item) => item.name === vendor);

  // โหลดข้อมูลทรัพย์สิน
  useEffect(() => {
    if (!ready || !todayDate || requestedAssetId === null) return;

    const idToLoad =
      requestedAssetId ||
      localStorage.getItem(KEYS.selectedAsset) ||
      "";

    if (!idToLoad) {
      alert("กรุณาเลือกทรัพย์สินที่ต้องการแก้ไข");
      router.push("/assets");
      return;
    }

    if (loadedAssetId === idToLoad) return;

    const asset =
      assets.find((item) => item.id === idToLoad) ||
      sampleAssets.find((item) => item.id === idToLoad);

    if (!asset) {
      alert("ไม่พบข้อมูลทรัพย์สิน");
      router.push("/assets");
      return;
    }

    localStorage.setItem(KEYS.selectedAsset, asset.id);

    setAssetId(asset.id);
    setName(asset.name);
    setVendor(asset.vendor);
    setCategory(asset.type);
    setBranchId(asset.branchId);
    setReceived(asset.received);

    setOriginalWarrantyUntil(asset.warrantyUntil || "");
    setWarrantyDuration("");
    setWarrantyUnit("ปี");

    setPrice(String(asset.price ?? 0));
    setPurchaseDate(asset.purchaseDate || todayDate);
    setUsefulLifeYears(String(asset.usefulLifeYears ?? 5));

    setImage(typeof asset.image === "string" ? asset.image : "");
    setQrCode("");
    setLoadedAssetId(asset.id);
  }, [
    ready,
    todayDate,
    requestedAssetId,
    loadedAssetId,
    assets,
    router,
  ]);

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
  async function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพ");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
      event.target.value = "";
      return;
    }

    try {
      const compressedImage = await compressImageFile(file);
      setImage(compressedImage);
    } catch (error) {
      console.error("Image error:", error);
      alert("ไม่สามารถอ่านหรือบีบอัดรูปภาพได้");
    } finally {
      event.target.value = "";
    }
  }

  // บันทึกข้อมูล
  function handleSave() {
    if (saving) return;

    if (!assetId) {
      alert("ไม่พบรหัสทรัพย์สินที่ต้องการแก้ไข");
      return;
    }

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

    if (!purchaseDate || !todayDate || purchaseDate > todayDate) {
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

    if (warrantyDuration.trim() !== "" && !calculatedWarrantyUntil) {
      alert("ไม่สามารถคำนวณวันหมดประกันได้");
      return;
    }

    setSaving(true);

    try {
      const nextWarrantyUntil = warrantyDuration.trim()
        ? calculatedWarrantyUntil
        : originalWarrantyUntil;

      const existingAsset = assets.find(
        (asset) => asset.id === assetId
      );

      const sampleAsset = sampleAssets.find(
        (asset) => asset.id === assetId
      );

      if (!existingAsset && !sampleAsset) {
        alert("ไม่พบข้อมูลทรัพย์สินที่ต้องการบันทึก");
        return;
      }

      const updatedAsset = {
        name: name.trim(),
        vendor: vendor.trim(),
        type: category,
        branchId,
        price: Number(price),
        purchaseDate,
        warrantyUntil: nextWarrantyUntil || "",
        usefulLifeYears: Number(usefulLifeYears),
        image,
      };

      // อัปเดตเฉพาะรายการที่มี ID ตรงกัน
      setAssets((prev) => {
        const found = prev.some(
          (asset) => asset.id === assetId
        );

        if (found) {
          return prev.map((asset) =>
            asset.id === assetId
              ? { ...asset, ...updatedAsset }
              : asset
          );
        }

        return [
          ...prev,
          {
            ...sampleAsset!,
            ...updatedAsset,
          },
        ];
      });

      log("Admin", `แก้ไขทรัพย์สิน ${assetId}`);

      alert("แก้ไขข้อมูลทรัพย์สินสำเร็จ");
      router.push("/assets");
    } catch (error) {
      console.error("Save asset error:", error);
      alert(
        "บันทึกไม่สำเร็จ พื้นที่จัดเก็บอาจเต็ม กรุณาลองเลือกรูปภาพที่มีขนาดเล็กลง"
      );
    } finally {
      setSaving(false);
    }
  }

  // รูปแบบ
  const labelClass =
    "mb-1.5 block text-sm font-medium text-slate-700";

  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-4 focus:ring-teal-50 disabled:bg-slate-50 disabled:text-slate-400";

  const cardClass =
    "flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

  const titleClass =
    "mb-5 text-lg font-bold text-slate-800";

  const isCorrectAssetLoaded =
    requestedAssetId !== null &&
    loadedAssetId !== "" &&
    (!requestedAssetId || loadedAssetId === requestedAssetId);

  if (!ready || !todayDate || !isCorrectAssetLoaded) {
    return (
      <main className="-mt-6 min-h-screen w-full bg-white px-4 pt-0 pb-4 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px] rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          กำลังโหลดข้อมูลทรัพย์สิน...
        </div>
      </main>
    );
  }

  return (
    <main className="-mt-3 min-h-screen w-full bg-white px-4 pt-0 pb-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">

        <header className="-ml-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            แก้ไขข้อมูลทรัพย์สิน
          </h1>

          <span className="inline-flex w-fit rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
            {assetId}
          </span>
        </header>

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-x-6 lg:gap-y-5">

          <section className={cardClass}>
            <h2 className={titleClass}>ข้อมูลทั่วไป</h2>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">

              <div>
                <label className={labelClass}>รหัสทรัพย์สิน</label>
                <input value={assetId} readOnly className={inputClass} />
              </div>

              <div>
                <label className={labelClass}>ชื่อทรัพย์สิน</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="กรอกชื่อทรัพย์สิน"
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>ผู้จำหน่าย</label>

                <select
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  className={inputClass}
                >
                  <option value="">-- เลือกผู้จำหน่าย --</option>
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
                        <p className="text-xs text-slate-500">ที่อยู่</p>
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

              <div>
                <label className={labelClass}>หมวดหมู่</label>
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
                    <option value={category}>{category}</option>
                  )}
                </select>
              </div>

              <div>
                <label className={labelClass}>สาขา</label>
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

              <div>
                <label className={labelClass}>ระยะเวลารับประกัน</label>
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

                <p className="mt-1 text-xs text-slate-400">
                  เว้นว่างหากไม่มีข้อมูลระยะเวลารับประกัน
                </p>
              </div>

              <div>
                <label className={labelClass}>ประกันถึงวันที่</label>
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

          <section className={cardClass}>
            <h2 className={titleClass}>รูปภาพทรัพย์สิน</h2>

            <div className="flex flex-1 flex-col items-center justify-center gap-4">
              {image ? (
                <img
                  src={image}
                  alt={`รูปทรัพย์สิน ${assetId}`}
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
                รองรับรูปภาพขนาดไม่เกิน 5 MB
              </p>
              <p className="text-xs text-slate-400">
                รูปภาพนี้จะถูกบันทึกไว้กับรหัส {assetId} เท่านั้น
              </p>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className={titleClass}>กำหนดค่าเสื่อมราคา</h2>

            <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>ราคาซื้อ (บาท)</label>
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
                <label className={labelClass}>วันที่ซื้อ</label>
                <input
                  type="date"
                  value={purchaseDate}
                  max={todayDate}
                  onChange={(e) => setPurchaseDate(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>อายุการใช้งาน (ปี)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={usefulLifeYears}
                  onChange={(e) => setUsefulLifeYears(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">ค่าเสื่อมราคาต่อปี</p>
                <p className="mt-2 text-lg font-bold text-slate-800">
                  {baht(depreciationPerYear)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">มูลค่าคงเหลือปัจจุบัน</p>
                <p className="mt-2 text-lg font-bold text-[#00786F]">
                  {baht(currentValue)}
                </p>
              </div>
            </div>
          </section>

          <section className={cardClass}>
            <h2 className={titleClass}>QR Code ทรัพย์สิน</h2>

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

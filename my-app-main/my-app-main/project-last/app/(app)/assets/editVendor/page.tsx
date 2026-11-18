
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui";
import { useAppData } from "@/lib/storage";

export default function EditVendorPage() {
  const router = useRouter();
  const params = useSearchParams();
  const name = params.get("name") || "";

  const { vendors, setVendors, addVendor, setAssets, log } = useAppData();

  const [vendorName, setVendorName] = useState("");
  const [phone, setPhone] = useState("");
  const [warranty, setWarranty] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const vendor = vendors.find(
      (item) => item.name.trim() === name
    );

    if (vendor) {
      setVendorName(vendor.name);
      setPhone(vendor.phone || "");
      setWarranty(vendor.warranty || "");
      setAddress(vendor.address || "");
    } else {
      setVendorName(name);
    }
  }, [vendors, name]);

  const handleSave = () => {
    const trimmedName = vendorName.trim();

    if (!trimmedName) {
      alert("กรุณากรอกชื่อผู้จำหน่าย");
      return;
    }

    const existingVendor = vendors.find(
      (item) => item.name.trim() === name
    );

    const duplicate = vendors.some(
      (item) =>
        item.name.trim() === trimmedName &&
        item.id !== existingVendor?.id
    );

    if (duplicate) {
      alert("มีชื่อผู้จำหน่ายนี้อยู่แล้ว");
      return;
    }

    if (existingVendor) {
      setVendors((prev) =>
        prev.map((item) =>
          item.id === existingVendor.id
            ? {
                ...item,
                name: trimmedName,
                phone,
                warranty,
                address,
              }
            : item
        )
      );
    } else {
      addVendor({
        name: trimmedName,
        phone,
        warranty,
        address,
      });
    }

    if (trimmedName !== name) {
      setAssets((prev) =>
        prev.map((asset) =>
          asset.vendor.trim() === name
            ? { ...asset, vendor: trimmedName }
            : asset
        )
      );
    }

    if (existingVendor) {
      log("Admin", `แก้ไขข้อมูลผู้จำหน่าย ${trimmedName}`);
    }

    alert("บันทึกการแก้ไขเรียบร้อยแล้ว");
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-slate-800">
          แก้ไขข้อมูลผู้จำหน่าย
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          แก้ไขรายละเอียดข้อมูลผู้จำหน่าย
        </p>
      </header>

      <Card>
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ชื่อผู้จำหน่าย
            </label>
            <input
              type="text"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              placeholder="กรอกชื่อผู้จำหน่าย"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#00786F]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              เบอร์โทรศัพท์
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="กรอกเบอร์โทรศัพท์"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#00786F]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              ที่อยู่
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={4}
              placeholder="กรอกที่อยู่ผู้จำหน่าย"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-[#00786F]"
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          ยกเลิก
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="rounded-xl bg-[#00786F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665E]"
        >
          บันทึกการแก้ไข
        </button>
      </div>
    </div>
  );
}

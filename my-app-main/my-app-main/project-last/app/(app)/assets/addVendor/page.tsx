
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { useAppData } from "@/lib/storage";

export default function AddVendorPage() {
  const router = useRouter();
  const { addVendor } = useAppData();

  const [vendor, setVendor] = useState("");
  const [phone, setPhone] = useState("");
  const [warranty, setWarranty] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!vendor.trim()) {
      alert("กรุณากรอกชื่อผู้จำหน่าย");
      return;
    }

    addVendor({
      name: vendor.trim(),
      phone: phone.trim(),
      warranty: warranty.trim(),
      address: address.trim(),
    });

    router.push("/assets?vendorTab=true");
  };

  const handleCancel = () => {
    router.push("/assets?vendorTab=true");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">
          เพิ่มผู้จำหน่าย
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          กรอกข้อมูลผู้จำหน่ายรายใหม่
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ชื่อผู้จำหน่าย *
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="กรอกชื่อผู้จำหน่าย"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00786F]"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="กรอกเบอร์โทรศัพท์"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00786F]"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              ที่อยู่
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="กรอกที่อยู่ผู้จำหน่าย"
              rows={3}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#00786F]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              ยกเลิก
            </button>

            <button
              type="submit"
              className="rounded-xl bg-[#00786F] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665E]"
            >
              บันทึกผู้จำหน่าย
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

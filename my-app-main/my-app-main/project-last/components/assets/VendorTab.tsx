
"use client";

import { Card } from "@/components/ui";
import { useAppData } from "@/lib/storage";
import { useRouter } from "next/navigation";

export default function VendorTab() {
  const { assets, vendors: savedVendors } = useAppData();
  const router = useRouter();

  const vendorsByName = new Map(
    assets
      .map((asset) => asset.vendor.trim())
      .filter(Boolean)
      .map((name) => [
        name,
        {
          id: `asset-${name}`,
          name,
          phone: "",
          warranty: "",
          address: "",
        },
      ])
  );

  savedVendors.forEach((vendor) => {
    const name = vendor.name.trim();
    if (name) vendorsByName.set(name, { ...vendor, name });
  });

  const sortedVendors = Array.from(vendorsByName.values()).sort(
    (a, b) => a.name.localeCompare(b.name, "th")
  );

  const handleAddVendor = () => {
    router.push("/assets/addVendor");
  };

  // กด Vendor เพื่อไปหน้าแก้ไขข้อมูล
const handleVendorClick = (vendor: { id: string; name: string }) => {
  router.push(
    `/assets/editVendor?name=${encodeURIComponent(vendor.name)}`
  );
};

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            ผู้จำหน่าย
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            ผู้ขายที่อ้างอิงอยู่ในรายการทรัพย์สิน
          </p>
        </div>

        <button
          type="button"
          onClick={handleAddVendor}
          className="rounded-xl bg-[#00786F] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665E]"
        >
          + เพิ่มผู้จำหน่าย
        </button>
      </header>

      <Card>
        {sortedVendors.length > 0 ? (
          <ul className="divide-y divide-slate-100">
            {sortedVendors.map((vendor) => (
              <li key={vendor.id}>
                <button
                  type="button"
                  onClick={() => handleVendorClick(vendor)}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-700">
                      {vendor.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      {vendor.phone || "ไม่ระบุเบอร์โทร"} ·{" "}
                      {vendor.warranty || "ไม่ระบุประกัน"}
                    </p>

                    {vendor.address && (
                      <p className="text-sm text-slate-500">
                        {vendor.address}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm text-slate-500">
                      {assets.filter(
                        (asset) => asset.vendor.trim() === vendor.name
                      ).length} รายการ
                    </span>

                    <span className="text-lg text-slate-400">
                      ›
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">
            ยังไม่มีผู้ขายในรายการทรัพย์สิน
          </p>
        )}
      </Card>
    </div>
  );
}

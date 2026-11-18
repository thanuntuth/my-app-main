"use client";

import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/tailgrids/core/native-select";

export default function Page() {
  return (
    <div>
      <h1 className="text-xl font-semibold">
        กำหนดสิทธิ์ผู้ใช้งาน
      </h1>

      {/* สิทธิ์ผู้ใช้งาน */}
      <div className="w-full max-w-sm">
        <label className="mb-2 block text-sm font-medium">
          เลือก user ที่ต้องการกำหนดสิทธิ์
        </label>

        <NativeSelect placeholder="Select an option">
          <NativeSelectOption value="user1">
            User 1
          </NativeSelectOption>

          <NativeSelectOption value="user2">
            User 2
          </NativeSelectOption>

          <NativeSelectOption value="user3">
            User 3
          </NativeSelectOption>
        </NativeSelect>
      </div>
    </div>
  );
}
import { AssetStatus, CountResult } from "./types";

export const STATUS_LABEL: Record<AssetStatus, string> = {
  "in-transit": "ระหว่างจัดส่ง",
  normal: "ปกติ",
  damaged: "ชำรุด",
  "needs-repair": "ต้องซ่อม",
};
export const RESULT_LABEL: Record<CountResult, string> = {
  found: "พบ",
  "not-found": "ไม่พบ",
  damaged: "ชำรุด",
  "needs-repair": "ต้องซ่อม",
};
export const ROUND_LABEL = { open: "กำลังนับ", review: "รอตรวจผล", closed: "ปิดรอบแล้ว" } as const;
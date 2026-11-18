import { Asset, Branch, CountRound } from "./types";

export const sampleBranches: Branch[] = [
  { id: "hq", name: "บริษัทแม่ (คลังกลาง)" },
  { id: "b1", name: "สาขา 1" },
];

export const sampleAssets: Asset[] = [
  {
    id: "AST-0001", name: "โน้ตบุ๊ก", type: "IT", price: 30000, purchaseDate: "2023-11-01",
    vendor: "ABC Computer", warrantyUntil: "2026-11-01", usefulLifeYears: 5,
    branchId: "b1", status: "needs-repair", received: true, approvalStatus: "รออนุมัติ",
    requester: "สมชาย ใจดี", requestDate: "2026-11-11"
  },
  {
    id: "AST-0002", name: "เครื่องพิมพ์", type: "IT", price: 12000, purchaseDate: "2024-06-15",
    vendor: "ABC Computer", warrantyUntil: "2026-06-15", usefulLifeYears: 5,
    branchId: "b1", status: "normal", received: true, approvalStatus: "รออนุมัติ",
    requester: "สุดา รักงาน", requestDate: "2026-11-11"
  },
  {
    id: "AST-0003", name: "โต๊ะทำงาน", type: "เฟอร์นิเจอร์", price: 6500, purchaseDate: "2025-02-10",
    vendor: "Home Office", warrantyUntil: "2027-02-10", usefulLifeYears: 10,
    branchId: "b1", status: "in-transit", received: false
  },
];

// รอบนับตัวอย่างที่สาขาส่งผลมาแล้ว (สถานะ review)
// ไว้ให้คุณทดสอบหน้า "ตรวจผลนับ" ได้เลยโดยไม่ต้องรอ Store ทำหน้านับเสร็จ
export const sampleRound: CountRound = {
  id: 1,
  name: "รอบทดสอบ",
  date: "2026-11-30",
  status: "review",
  results: {
    "AST-0001": { result: "found" },
    "AST-0002": { result: "damaged", note: "หน้าจอแตก" },
  },
  extras: [{ name: "พัดลมตั้งโต๊ะ (ไม่มี QR)" }],
};
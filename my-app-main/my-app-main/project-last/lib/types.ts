export type RoleId = "super-admin" | "admin" | "store";

// สถานะของทรัพย์สินเอง
export type AssetStatus = "in-transit" | "normal" | "damaged" | "needs-repair";

// ผลการนับรายชิ้น (ทุกคนต้องใช้ชื่อนี้ตรงกัน)
export type CountResult = "found" | "not-found" | "damaged" | "needs-repair";


export interface Branch {
  id: string;
  name: string;
}

export interface Asset {
  id: string;               // "AST-0001"
  name: string;
  type: string;             // ประเภท / หมวดหมู่
  price: number;
  purchaseDate: string;     // "2023-11-01"
  vendor: string;
  warrantyUntil: string;    // "" ถ้าไม่มีประกัน
  usefulLifeYears: number;  // อายุการใช้งาน (ปี) ใช้คำนวณค่าเสื่อมแบบเส้นตรง
  branchId: string;
  status: AssetStatus;
  received: boolean;        // สาขายืนยันรับแล้วหรือยัง
  image?: string;           // รูปทรัพย์สิน (data URL)
  approvalStatus?: "รออนุมัติ" | "อนุมัติแล้ว" | "ไม่อนุมัติ";
  requester?: string;
  requestDate?: string;
}

export interface CountItemResult {
  result: CountResult;
  note?: string;
  photo?: string;           // ชื่อไฟล์รูป (ยังไม่อัปโหลดจริง)
  image?: string;           // รูปภาพความชำรุด (data URL)
}

export interface Checklist {
  branchId: string;
  assetIds: string[];        // ทรัพย์สินที่สาขานี้ต้องนับ
  status: "draft" | "sent";  // draft = Admin กำลังตรวจ, sent = ส่งให้สาขาแล้ว
  sentAt?: string;
}

export interface CountRound {
  id: number;               // CR-0001
  name: string;             // ชื่อรอบตรวจนับ
  branch?: string;          // สาขา
  date: string;             // วันที่ตรวจนับ
  status: "open" | "review" | "closed"; // open = สาขากำลังนับ, review = Admin ตรวจผล
  checklists?: Checklist[];
  results: Record<string, CountItemResult>;        // key = asset id
  extras: { name: string; note?: string }[];       // พบแต่ไม่อยู่ในรายการ
}
export interface Repair {
  id: string;                      // RPR-0001
  assetId: string;
  sentDate: string;
  vendor: string;                  // ร้าน / ผู้ซ่อม
  note?: string;
  status: "in-repair" | "done";
  doneDate?: string;
  cost?: number;
}

export interface Movement {
  id: string;
  assetId: string;
  from: string;
  to: string;
  date: string;
  approvalStatus?: "รออนุมัติ" | "อนุมัติแล้ว" | "ไม่อนุมัติ";
  requester?: string;
}
export interface LogEntry {
  at: string;               // ISO date
  who: string;
  action: string;
}
export type Vendor = {
  id: string;
  name: string;
  phone: string;
  warranty: string;
  address: string;
};


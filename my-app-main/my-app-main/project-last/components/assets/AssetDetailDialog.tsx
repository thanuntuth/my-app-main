// "use client";

// import { useEffect, useState, type ReactNode } from "react";
// import { useRouter } from "next/navigation";
// import QRCode from "qrcode";

// import { Badge, Button } from "@/components/ui";
// import { baht, remainingValue, today, yearlyDepreciation } from "@/lib/depreciation";
// import { RESULT_LABEL, STATUS_LABEL } from "@/lib/labels";
// import { KEYS, useAppData } from "@/lib/storage";
// import type { Asset, AssetStatus, CountItemResult, CountResult } from "@/lib/types";
// import { useCan } from "@/lib/useCan";

// const STATUS_TONE: Record<AssetStatus, "green" | "red" | "amber" | "gray"> = {
//   normal: "green",
//   damaged: "red",
//   "needs-repair": "amber",
//   "in-transit": "gray",
// };

// const RESULT_TONE: Record<CountResult, "green" | "red" | "amber"> = {
//   found: "green",
//   "not-found": "red",
//   damaged: "amber",
//   "needs-repair": "amber",
// };

// function Field({ label, children }: { label: string; children: ReactNode }) {
//   return (
//     <div>
//       <p className="text-xs font-medium text-slate-400">{label}</p>
//       <div className="mt-1 text-sm font-medium text-slate-800">{children}</div>
//     </div>
//   );
// }

// function Section({ title, children }: { title: string; children: ReactNode }) {
//   return (
//     <div className="mt-6 border-t border-slate-100 pt-5">
//       <h3 className="mb-3 text-sm font-bold text-slate-800">{title}</h3>
//       {children}
//     </div>
//   );
// }

// export default function AssetDetailDialog({
//   asset,
//   result,
//   onClose,
// }: {
//   asset: Asset;
//   result?: CountItemResult; // ผลนับของรอบปัจจุบัน (ใส่เมื่อเปิดจากแท็บตรวจผลนับ)
//   onClose: () => void;
// }) {
//   const router = useRouter();
//   const can = useCan();
//   const { branches, repairs, moves } = useAppData();
//   const [qr, setQr] = useState("");

//   // QR สร้างจากรหัสตอนแสดงผล
//   useEffect(() => {
//     QRCode.toDataURL(asset.id, { width: 200, margin: 2 })
//       .then(setQr)
//       .catch(() => setQr(""));
//   }, [asset.id]);

//   // กด Esc เพื่อปิด
//   useEffect(() => {
//     const onKey = (e: KeyboardEvent) => {
//       if (e.key === "Escape") onClose();
//     };
//     window.addEventListener("keydown", onKey);
//     return () => window.removeEventListener("keydown", onKey);
//   }, [onClose]);

//   const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
//   const myRepairs = repairs.filter((r) => r.assetId === asset.id);
//   const myMoves = moves.filter((m) => m.assetId === asset.id);
//   const inWarranty = !!asset.warrantyUntil && asset.warrantyUntil >= today();

//   const edit = () => {
//     localStorage.setItem(KEYS.selectedAsset, asset.id);
//     router.push("/assets/edit");
//   };

//   return (
//     <div
//       className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
//       onMouseDown={(e) => {
//         if (e.target === e.currentTarget) onClose();
//       }}
//     >
//       <section
//         role="dialog"
//         aria-modal="true"
//         aria-labelledby="asset-detail-title"
//         className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
//       >
//         {/* หัว */}
//         <div className="flex items-start justify-between gap-4">
//           <div>
//             <p className="text-sm font-semibold text-[#00786F]">{asset.id}</p>
//             <h2 id="asset-detail-title" className="mt-1 text-xl font-bold text-slate-800">
//               {asset.name}
//             </h2>
//           </div>
//           <button
//             onClick={onClose}
//             aria-label="ปิด"
//             className="rounded-lg px-3 py-1 text-xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
//           >
//             ×
//           </button>
//         </div>

//         {/* ข้อมูลทั่วไป + รูป/QR */}
//         <div className="mt-5 flex flex-col-reverse gap-6 sm:flex-row">
//           <div className="grid flex-1 grid-cols-1 content-start gap-x-6 gap-y-4 sm:grid-cols-2">
//             <Field label="ประเภท">{asset.type}</Field>
//             <Field label="ผู้ขาย">{asset.vendor}</Field>
//             <Field label="สาขา">{branchName(asset.branchId)}</Field>
//             <Field label="สถานะ">
//               <Badge tone={STATUS_TONE[asset.status]}>{STATUS_LABEL[asset.status]}</Badge>
//             </Field>
//             <Field label="การรับของ">
//               {asset.received ? "สาขารับแล้ว" : "รอสาขายืนยันรับ"}
//             </Field>
//             <Field label="วันที่ซื้อ">{asset.purchaseDate}</Field>
//             <Field label="ประกันถึง">
//               <span className="mr-2">{asset.warrantyUntil || "-"}</span>
//               {asset.warrantyUntil ? (
//                 inWarranty ? <Badge tone="green">อยู่ในประกัน</Badge> : <Badge>หมดประกัน</Badge>
//               ) : (
//                 <Badge>ไม่มีประกัน</Badge>
//               )}
//             </Field>
//           </div>

//           <div className="w-44 shrink-0 space-y-3">
//             {asset.image ? (
//               <img
//                 src={asset.image}
//                 alt={asset.name}
//                 className="h-36 w-full rounded-xl border border-slate-200 bg-white object-contain p-2"
//               />
//             ) : (
//               <div className="flex h-36 w-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-400">
//                 ไม่มีรูปภาพ
//               </div>
//             )}
//             {qr && (
//               <img
//                 src={qr}
//                 alt={`QR ${asset.id}`}
//                 className="mx-auto h-28 w-28 rounded-lg border border-slate-200 object-contain"
//               />
//             )}
//           </div>
//         </div>

//         {/* ค่าเสื่อมราคา */}
//         <Section title="ราคาและค่าเสื่อมราคา">
//   <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
//     <Field label="ราคาซื้อ">
//       {baht(asset.price)}
//     </Field>

//     <Field label="อายุการใช้งาน">
//       {asset.usefulLifeYears} ปี
//     </Field>

//     <Field label="ค่าเสื่อมต่อปี">
//       {baht(
//   yearlyDepreciation(
//     asset.price,
//     asset.usefulLifeYears > 0
//       ? 100 / asset.usefulLifeYears
//       : 0
//   )
// )}
//     </Field>

//     <Field label="มูลค่าคงเหลือ">
//       <span className="text-[#00786F]">
//         {baht(
//           remainingValue(asset, new Date())
//         )}
//       </span>
//     </Field>
//   </div>
// </Section>

//         {/* ผลนับของรอบนี้ */}
//         {result && (
//           <Section title="ผลตรวจนับรอบนี้">
//             <div className="flex items-center gap-3 text-sm">
//               <Badge tone={RESULT_TONE[result.result]}>{RESULT_LABEL[result.result]}</Badge>
//               <span className="text-slate-600">{result.note ? `หมายเหตุ: ${result.note}` : "ไม่มีหมายเหตุ"}</span>
//             </div>
//           </Section>
//         )}

//         {/* ประวัติงานซ่อม */}
//         {myRepairs.length > 0 && (
//           <Section title={`ประวัติงานซ่อม (${myRepairs.length})`}>
//             <ul className="space-y-2 text-sm text-slate-600">
//               {myRepairs.map((r) => (
//                 <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
//                   <span className="font-semibold text-[#00786F]">{r.id}</span>
//                   <span>ร้าน {r.vendor}</span>
//                   <span>ส่ง {r.sentDate}</span>
//                   {r.status === "done" ? (
//                     <>
//                       <Badge tone="green">เสร็จแล้ว {r.doneDate}</Badge>
//                       <span>ค่าซ่อม {baht(r.cost ?? 0)}</span>
//                     </>
//                   ) : (
//                     <Badge tone="amber">กำลังซ่อม</Badge>
//                   )}
//                   {r.note && <span className="text-slate-400">({r.note})</span>}
//                 </li>
//               ))}
//             </ul>
//           </Section>
//         )}

//         {/* ประวัติการย้าย */}
//         {myMoves.length > 0 && (
//           <Section title={`ประวัติการย้าย (${myMoves.length})`}>
//             <ul className="space-y-2 text-sm text-slate-600">
//               {myMoves.map((m) => (
//                 <li key={m.id}>
//                   <span className="font-semibold text-[#00786F]">{m.id}</span> · {m.date} ·{" "}
//                   {branchName(m.from)} → {branchName(m.to)}
//                 </li>
//               ))}
//             </ul>
//           </Section>
//         )}

//         {/* ปุ่ม */}
//         <div className="mt-7 flex justify-end gap-3">
//           <Button variant="outline" onClick={onClose}>ปิด</Button>
//           {can("assets.manage") && <Button onClick={edit}>แก้ไขข้อมูล</Button>}
//         </div>
//       </section>
//     </div>
//   );
// }
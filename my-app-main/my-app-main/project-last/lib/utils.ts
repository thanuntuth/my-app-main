import { Asset,CountRound } from "./types";

/** ออก ID ถัดไปจากเลขสูงสุดที่มี เช่น AST-0004 */
export function nextAssetId(assets: Pick<Asset, "id">[]): string {
  const max = assets.reduce((m, a) => Math.max(m, Number(a.id.replace("AST-", "")) || 0), 0);
  return `AST-${String(max + 1).padStart(4, "0")}`;
}

//**สร้าง Qr Code */
export function generateQrCode(data: string): string {
  // Implementation for generating QR code
  return `qr-code-${data}`;
}
//** ID ของสาขาที่เก็บสินค้า */
export const STORE_BRANCH_ID = "b1";

/** รหัสทรัพย์สินที่ "สูญหาย" = ผลนับล่าสุดของชิ้นนั้นคือ "ไม่พบ"
 *  ดูทุกรอบ เรียงตามวันที่ ถ้ารอบหลังพบแล้ว ถือว่าไม่สูญหายอีก */
export function lostAssetIds(rounds: CountRound[]): Set<string> {
  const latest = new Map<string, { date: string; lost: boolean }>();
  for (const r of rounds) {
    for (const [id, res] of Object.entries(r.results)) {
      const prev = latest.get(id);
      if (!prev || r.date >= prev.date) {
        latest.set(id, { date: r.date, lost: res.result === "not-found" });
      }
    }
  }
  return new Set(
    Array.from(latest.entries())
      .filter(([, v]) => v.lost)
      .map(([id]) => id)
  );
}
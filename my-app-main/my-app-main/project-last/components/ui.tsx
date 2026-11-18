import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ---------- หัวข้อหน้า ---------- */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="text-xl font-bold text-slate-800 sm:text-2xl">{children}</h1>;
}
/* ---------- การ์ด ---------- */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

/* ---------- ปุ่ม ---------- */
type Variant = "primary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-[#00786F] text-white shadow-sm hover:bg-[#00665F]",
  outline: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  ghost: "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50", // เหมือน outline (บางหน้าใช้ชื่อนี้)
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button" // ค่าเริ่มต้น กันปุ่มในฟอร์มส่งฟอร์มโดยไม่ตั้งใจ ถ้าต้องการส่งฟอร์มให้ใส่ type="submit"
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

/* ---------- ป้ายสถานะ ---------- */
const TONES = {
  gray: "bg-slate-100 text-slate-700",
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-blue-50 text-blue-700",
  purple: "bg-purple-50 text-purple-700",
};

export function Badge({
  tone = "gray",
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}
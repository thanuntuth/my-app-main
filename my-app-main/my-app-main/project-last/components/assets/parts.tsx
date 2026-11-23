import type { ReactNode } from "react";

// การ์ดตัวเลขสรุป (หน้าตาเดิมของข้าว)
export function Stat({
  label,
  value,
  tag,
  valueColor,
  tagStyle,
}: {
  label: string;
  value: number | string;
  tag: string;
  valueColor: string;
  tagStyle: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <p className={`text-2xl font-bold sm:text-3xl ${valueColor}`}>
          {typeof value === "number" ? value.toLocaleString("th-TH") : value}
        </p>
        <span className={`rounded-lg px-3 py-2 text-xs font-medium ${tagStyle}`}>{tag}</span>
      </div>
    </div>
  );
}

// กล่องเนื้อหามีหัวการ์ด 
export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-5">
        <div>
          <h3 className="font-bold text-slate-800">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

// หน้าจอว่าง
export function EmptyState({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-2xl">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-800">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

// กล่องเตือนสีเหลือง
export function Notice({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <span className="text-lg">⚠️</span>
      <div>
        <p className="text-sm font-semibold text-amber-800">{title}</p>
        {children && <p className="mt-0.5 text-sm text-amber-700">{children}</p>}
      </div>
    </div>
  );
}

// สไตล์ตารางกลาง (ตรงกับตารางหน้ารายการ)
export const TABLE_WRAP = "w-full overflow-x-auto rounded-xl border border-slate-200";
export const THEAD = "bg-slate-50 text-slate-600";
export const TH = "whitespace-nowrap px-5 py-4 font-semibold";
export const TD = "whitespace-nowrap px-5 py-4 text-slate-600";
export const TBODY = "divide-y divide-slate-100 bg-white";
export const ROW = "transition hover:bg-teal-50/40";

// ช่องกรอกและป้ายกำกับ
export const LABEL = "mb-1.5 block text-sm font-medium text-slate-700";
export const INPUT =
  "rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-4 focus:ring-teal-50 disabled:bg-slate-50 disabled:text-slate-400";
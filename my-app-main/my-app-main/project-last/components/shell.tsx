
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

import { Badge, Card } from "@/components/ui";
import {
  DEFAULT_ROLES,
  NAV,
  ROLE_HOME,
  ROLE_LABEL,
  ROLES_CHANGED_EVENT,
  USER_PERMISSIONS_CHANGED_EVENT,
  normalizeUserPermissions,
  type RolePermissions,
  type UserPermissionOverrides,
} from "@/lib/permissions";
import { KEYS, useLocalState } from "@/lib/storage";
import type { RoleId } from "@/lib/types";

const HIDDEN_NAV_LABELS = new Set(["รับทรัพย์สิน", "ตรวจนับ"]);

const TEST_USERNAME_BY_ROLE: Record<RoleId, string> = {
  "super-admin": "superadmin",
  admin: "admin",
  store: "store",
};

function isRoleId(value: unknown): value is RoleId {
  return (
    typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(ROLE_LABEL, value)
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  // เมนูมือถือ: ปิดด้วยปุ่ม Esc และล็อกการเลื่อนหน้าขณะเปิด
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const [role, setRole, ready] = useLocalState<RoleId | null>(
    KEYS.role,
    null
  );

  const [roles, setRoles, rolesReady] = useLocalState(
    KEYS.roles,
    DEFAULT_ROLES
  );

  const [username, setUsername, usernameReady] =
    useLocalState<string | null>(KEYS.username, null);

  const [userPermissions, setUserPermissions, userPermissionsReady] =
    useLocalState<UserPermissionOverrides>(KEYS.permissions, {});

  // Sync role และ permission ระหว่าง Component
  useEffect(() => {
    const syncRoles = (event: Event) => {
      const updatedRoles = (event as CustomEvent<RolePermissions>).detail;
      if (updatedRoles) setRoles(updatedRoles);
    };

    const syncUserPermissions = (event: Event) => {
      const updatedPermissions = (
        event as CustomEvent<UserPermissionOverrides>
      ).detail;

      if (updatedPermissions) setUserPermissions(updatedPermissions);
    };

    window.addEventListener(ROLES_CHANGED_EVENT, syncRoles);
    window.addEventListener(
      USER_PERMISSIONS_CHANGED_EVENT,
      syncUserPermissions
    );

    return () => {
      window.removeEventListener(ROLES_CHANGED_EVENT, syncRoles);
      window.removeEventListener(
        USER_PERMISSIONS_CHANGED_EVENT,
        syncUserPermissions
      );
    };
  }, [setRoles, setUserPermissions]);

  // รองรับ username แบบเก่า
  useEffect(() => {
    if (!usernameReady || username) return;

    const legacyUsername = localStorage.getItem("currentUser");

    if (legacyUsername) {
      setUsername(legacyUsername);
    }
  }, [setUsername, username, usernameReady]);

  // ปรับรูปแบบ permission ให้เป็นมาตรฐาน
  useEffect(() => {
    const normalized = normalizeUserPermissions(userPermissions);

    if (
      JSON.stringify(normalized) !==
      JSON.stringify(userPermissions)
    ) {
      setUserPermissions(normalized);
    }
  }, [setUserPermissions, userPermissions]);

  // ตรวจสอบ Role และ Login
  useEffect(() => {
    if (!ready) return;

    const saved = localStorage.getItem(KEYS.role);

    if (saved === null) {
      router.replace("/login");
      return;
    }

    let current: unknown;

    try {
      current = JSON.parse(saved);
    } catch (error) {
      console.warn(
        `localStorage "${KEYS.role}" is not valid JSON:`,
        error
      );
      router.replace("/login");
      return;
    }

    if (!isRoleId(current)) {
      console.warn(
        `localStorage "${KEYS.role}" has an invalid role:`,
        current
      );
      router.replace("/login");
      return;
    }

    if (current !== role) {
      setRole(current);
    }
  }, [path, ready, role, router, setRole]);

  // รอข้อมูลทั้งหมดให้พร้อม
  const isReady =
    ready &&
    rolesReady &&
    usernameReady &&
    userPermissionsReady &&
    !!role;

  // ตรวจสอบสิทธิ์ของ Role
  const activePermissions = role
    ? roles[role] ?? DEFAULT_ROLES[role]
    : [];

  const items = NAV.filter(
    (item) =>
      activePermissions.includes(item.perm) &&
      !HIDDEN_NAV_LABELS.has(item.label)
  );

  const current = NAV.find((item) => item.href === path);

  const allowed =
    !current ||
    (role !== null && activePermissions.includes(current.perm));

  const logout = () => {
    localStorage.removeItem(KEYS.role);
    localStorage.removeItem(KEYS.username);
    setRole(null);
    router.replace("/login");
  };

  const resetTestData = () => {
    Object.values(KEYS)
      .filter((key) => key !== KEYS.role)
      .forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem("currentUser");
    window.location.reload();
  };

  const switchRole = (nextRole: RoleId) => {
    const nextUsername = TEST_USERNAME_BY_ROLE[nextRole];
    setUsername(nextUsername);
    localStorage.setItem("currentUser", nextUsername);
    setRole(nextRole);
    setMenuOpen(false);
    router.push(ROLE_HOME[nextRole]);
  };

  const isActive = (href: string) =>
    path === href || path.startsWith(`${href}/`);

  const currentLabel =
    NAV.find((item) => isActive(item.href))?.label ?? "ตรวจนับทรัพย์สิน";

  const renderSidebar = (mobile: boolean) => (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* โลโก้ / ชื่อระบบ */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
          <NavIcon href="/assets" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold leading-tight">
            ตรวจนับทรัพย์สิน
          </p>
          <p className="truncate text-xs text-white/50">ระบบจัดการทรัพย์สิน</p>
        </div>
        {mobile && (
          <button
            type="button"
            aria-label="ปิดเมนู"
            onClick={() => setMenuOpen(false)}
            className="ml-auto rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        )}
      </div>

      {/* ผู้ใช้ปัจจุบัน */}
      <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold uppercase">
          {(username ?? "?").slice(0, 1)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{username ?? "-"}</p>
          <p className="truncate text-xs text-white/50">
            {role ? ROLE_LABEL[role] : ""}
          </p>
        </div>
      </div>

      {/* เมนู */}
      <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-white/40">
          เมนู
        </p>
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    active
                      ? "bg-teal-700 font-semibold text-white"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <NavIcon href={item.href} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ส่วนท้าย: เครื่องมือทดสอบ + ออกจากระบบ */}
      <div className="space-y-2 border-t border-white/10 p-4">
        <select
          aria-label="ทดสอบเปลี่ยน role"
          className="w-full rounded-lg border-0 bg-white/10 px-3 py-2 text-sm text-white"
          value={role ?? ""}
          onChange={(event) => switchRole(event.target.value as RoleId)}
        >
          {(Object.keys(ROLE_LABEL) as RoleId[]).map((roleId) => (
            <option key={roleId} value={roleId} className="text-slate-900">
              ทดสอบ: {ROLE_LABEL[roleId]}
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/20 px-2 py-2 text-xs text-white/80 hover:bg-white/10"
            onClick={resetTestData}
          >
            รีเซ็ตข้อมูล
          </button>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-2 py-2 text-xs font-semibold hover:bg-red-600"
            onClick={logout}
          >
            ออกจากระบบ
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen w-full bg-white">
      <div style={{ visibility: isReady ? "visible" : "hidden" }}>
        {/* Sidebar จอใหญ่ (lg ขึ้นไป): ติดอยู่ด้านซ้าย */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
          {renderSidebar(false)}
        </aside>

        {/* Sidebar จอเล็ก: เลื่อนออกมาจากด้านซ้าย */}
        <div
          className={`fixed inset-0 z-40 lg:hidden ${
            menuOpen ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`absolute inset-0 bg-slate-900/50 transition-opacity duration-200 ${
              menuOpen ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMenuOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="เมนูหลัก"
            inert={!menuOpen}
            className={`absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl transition-transform duration-200 ${
              menuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {renderSidebar(true)}
          </aside>
        </div>

        <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
          {/* แถบด้านบนสำหรับจอเล็ก */}
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
            <button
              type="button"
              aria-label="เปิดเมนู"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="-ml-1 rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <p className="min-w-0 flex-1 truncate font-semibold text-slate-800">
              {currentLabel}
            </p>
            {role && <Badge tone="green">{ROLE_LABEL[role]}</Badge>}
          </header>

          {/* เนื้อหาของแต่ละหน้า */}
          <main className="w-full min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            {!isReady || allowed ? (
              children
            ) : (
              <Card>
                <Badge tone="red">ไม่มีสิทธิ์เข้าถึง</Badge>
                <p className="mt-3 text-slate-600">คุณไม่มีสิทธิ์เข้าหน้านี้</p>
              </Card>
            )}
          </main>
        </div>
      </div>

      {/* หน้ากำลังโหลด */}
      {!isReady && (
        <div className="absolute inset-0 flex min-h-screen items-center justify-center bg-slate-50">
          <p className="text-sm text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
      )}
    </div>
  );
}

/* ไอคอนเมนู (เส้น 24x24) */
const ICON_PATHS: Record<string, string> = {
  "/dashboard": "M4 13h6V4H4v9zm0 7h6v-5H4v5zm10 0h6v-9h-6v9zm0-16v5h6V4h-6z",
  "/count/schedule": "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  "/assets": "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  "/transfers/approve": "M7 7h13l-4-4M17 17H4l4 4",
  "/receive": "M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2",
  "/branch-assets": "M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6",
  "/count/countStore": "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9",
  "/roles": "M16 11a4 4 0 10-8 0 4 4 0 008 0zM4 21a8 8 0 0116 0",
  "/logs": "M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  "/report": "M9 17v-6M13 17V7M17 17v-3M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z",
};

function NavIcon({ href }: { href: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICON_PATHS[href] ?? "M4 6h16M4 12h16M4 18h16"} />
    </svg>
  );
}

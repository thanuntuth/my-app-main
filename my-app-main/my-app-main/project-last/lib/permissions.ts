import { RoleId } from "./types";

// รายการ permission ของระบบ โดยตัวเลือกที่กำหนดได้มาจาก NAV
export const PERMISSIONS = {
  "dashboard.view": "ดูภาพรวมและรายงาน",
  "count.schedule": "กำหนดวันตรวจนับ",
  "roles.manage": "จัดการ Role และสิทธิ์",
  "logs.view": "ดูประวัติการใช้งาน",
  "assets.manage": "บันทึกทรัพย์สิน / ออก ID + QR",
  "count.review": "ตรวจผลนับ / ส่งซ่อม",
  "transfers.approve": "อนุมัติการย้ายทรัพย์สิน",
  "transfers.record": "บันทึกการย้ายทรัพย์สิน",
  "assets.receive": "ยืนยันรับทรัพย์สิน",
  "branch.assets": "ดูทรัพย์สินของสาขาตัวเอง",
  "count.perform": "ตรวจนับทรัพย์สิน",
  "repairs.manage": "จัดการงานซ่อม",
  "report.view": "ดูรายงาน",
  "vendor.manage": "จัดการข้อมูลผู้ขาย",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export type RolePermissions = Record<RoleId, Permission[]>;
export type UserPermissionOverrides = Record<
  string,
  Partial<Record<Permission, boolean>>
>;
export const ROLES_CHANGED_EVENT = "roles-updated";
export const USER_PERMISSIONS_CHANGED_EVENT = "permissions-changed";

export const ROLE_LABEL: Record<RoleId, string> = {
  "super-admin": "Super admin",
  admin: "Admin",
  store: "Store",
};

// สิทธิ์เริ่มต้นของแต่ละ role (ย้ายสิทธิ์ข้าม role ได้ในหน้าจัดการสิทธิ์)
export const DEFAULT_ROLES: RolePermissions = {
  "super-admin": [
    "dashboard.view",
    "count.schedule",
    "transfers.approve",
    "logs.view",
    "assets.manage",
    "roles.manage",
  ],
  admin: ["assets.manage", "report.view"],
  store: ["assets.receive", "branch.assets", "count.perform"],
};

// เมนู: แต่ละหน้าผูกกับสิทธิ์ ถ้า role มีสิทธิ์นั้นถึงจะเห็นเมนู
export const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/dashboard", label: "ภาพรวมและรายงาน", perm: "dashboard.view" },
  { href: "/count/schedule", label: "กำหนดวันตรวจนับ", perm: "count.schedule" },
  { href: "/assets", label: "ทรัพย์สิน", perm: "assets.manage" },
  { href: "/transfers/approve", label: "อนุมัติการย้ายทรัพย์สิน", perm: "transfers.approve" },
  { href: "/receive", label: "รับทรัพย์สิน", perm: "assets.receive" },
  { href: "/branch-assets", label: "ทรัพย์สินของสาขา", perm: "branch.assets" },
  { href: "/count/countStore", label: "ตรวจนับ", perm: "count.perform" },
  { href: "/roles", label: "จัดการผู้ใช้งานและสิทธิ์", perm: "roles.manage" },
  { href: "/logs", label: "ประวัติการใช้งาน", perm: "logs.view" },
  {href:"/report", label: "รายงาน", perm: "report.view"},
];

const USER_MENU_LABELS: Partial<Record<Permission, string>> = {
  "dashboard.view": "ภาพรวมและรายงาน",
  "count.schedule": "กำหนดการตรวจนับ",
  "transfers.approve": "อนุมัติการย้ายทรัพย์สิน",
  "logs.view": "ประวัติการใช้งาน",
  "assets.manage": "ทรัพย์สิน",
  "roles.manage": "จัดการผู้ใช้งานและสิทธิ์",
  "report.view": "รายงาน",
  "branch.assets": "ทรัพย์สินสาขา",
  "assets.receive": "รับทรัพย์สิน",
  "count.perform": "ตรวจนับ",
};

export const USER_MANAGED_PERMISSIONS = NAV.map(({ perm: permission }) => ({
  permission,
  label: USER_MENU_LABELS[permission] ?? PERMISSIONS[permission],
}));

export function normalizeUserPermissions(value: unknown): UserPermissionOverrides {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  const normalized: UserPermissionOverrides = {};
  for (const [username, rawPermissions] of Object.entries(value)) {
    if (
      !rawPermissions ||
      typeof rawPermissions !== "object" ||
      Array.isArray(rawPermissions)
    ) {
      continue;
    }

    const userPermissions: Partial<Record<Permission, boolean>> = {};
    for (const [key, allowed] of Object.entries(rawPermissions)) {
      if (typeof allowed !== "boolean") continue;
      const item = USER_MANAGED_PERMISSIONS.find(
        ({ permission, label }) => permission === key || label === key,
      );
      if (item) userPermissions[item.permission] = allowed;
    }
    normalized[username] = userPermissions;
  }
  return normalized;
}

export function roleHasPermission(
  role: RoleId,
  permission: Permission,
  roles: RolePermissions,
) {
  return (
    DEFAULT_ROLES[role].includes(permission) ||
    Boolean(roles[role]?.includes(permission))
  );
}

export function canAccessPermission(
  role: RoleId,
  permission: Permission,
  roles: RolePermissions,
  userPermissions: UserPermissionOverrides,
  username: string | null,
) {
  const override = username
    ? userPermissions[username]?.[permission]
    : undefined;
  return typeof override === "boolean"
    ? override
    : roleHasPermission(role, permission, roles);
}

// หน้าแรกหลังล็อกอินของแต่ละ role
export const ROLE_HOME: Record<RoleId, string> = {
  "super-admin": "/dashboard",
  admin: "/assets",
  store: "/branch-assets",
};
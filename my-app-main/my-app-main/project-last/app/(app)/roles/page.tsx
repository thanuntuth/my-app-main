"use client";

import { useEffect, useState } from "react";

import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";

import { Button } from "@/components/tailgrids/core/button";

import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";

import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import { Backdrop } from "@/components/tailgrids/core/overlay";
import { TextField } from "@/components/tailgrids/core/text-field";
import {
  DEFAULT_ROLES,
  USER_MANAGED_PERMISSIONS,
  USER_PERMISSIONS_CHANGED_EVENT,
  normalizeUserPermissions,
  roleHasPermission,
  type Permission,
  type UserPermissionOverrides,
} from "@/lib/permissions";
import { KEYS, useLocalState } from "@/lib/storage";
import type { RoleId } from "@/lib/types";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputWrapper,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from "@/components/tailgrids/core/combobox";
import Switch from "@/components/Switch";

type RoleUser = {
  Name: string;
  Username: string;
  Password: string;
  Role: string;
  สาขา: string;
  isActive: boolean;
};

const DATA: RoleUser[] = [
  {
    Name: "ปาริชาติ สมรูป",
    Username: "super",
    Password: "1234",
    Role: "Super Admin",
    สาขา: "-",
    isActive: true,
  },
  {
    Name: "ธนันท์ทัต รัตน์ธนัทนันท์",
    Username: "admin",
    Password: "1234",
    Role: "Admin",
    สาขา: "-",
    isActive: true,
  },
  {
    Name: "วิมลสิริ สกุลเอื้อ",
    Username: "admin2", // เปลี่ยนจาก admin ให้ไม่ซ้ำกัน
    Password: "1234",
    Role: "Admin",
    สาขา: "-",
    isActive: true,
  },
  {
    Name: "วัชรวีร์ ลำภาษี",
    Username: "store",
    Password: "1234",
    Role: "Store",
    สาขา: "สาขา 1",
    isActive: true,
  },
];

function getUserRole(role: string): RoleId | null {
  const normalized = role.trim().toLowerCase();
  if (normalized === "super admin" || normalized === "super-admin") {
    return "super-admin";
  }
  if (normalized === "admin") return "admin";
  if (normalized === "store") return "store";
  return null;
}

export default function Page() {
  const [users, setUsers, usersReady] = useLocalState<RoleUser[]>(
    KEYS.roleUsers,
    DATA,
  );
  const [roles] = useLocalState(KEYS.roles, DEFAULT_ROLES);
  const [perms, setPerms, permissionsReady] =
    useLocalState<UserPermissionOverrides>(KEYS.permissions, {});
  const activeUsers = users.map((user) => user.isActive);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");

  // ===== สิทธิ์ =====
  // index ของผู้ใช้ที่เลือกใน Combobox (null = ยังไม่เลือก)
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  // ร่างสิทธิ์ที่กำลังแก้ (ยังไม่บันทึกจริง)
  const [draft, setDraft] = useState<Partial<Record<Permission, boolean>>>({});

  useEffect(() => {
    if (!permissionsReady) return;
    const normalized = normalizeUserPermissions(perms);
    if (JSON.stringify(normalized) !== JSON.stringify(perms)) {
      setPerms(normalized);
    }
  }, [permissionsReady, perms, setPerms]);

  const savePerms = (next: UserPermissionOverrides) => {
    setPerms(next);
    window.dispatchEvent(
      new CustomEvent(USER_PERMISSIONS_CHANGED_EVENT, { detail: next }),
    );
  };

  // key ของผู้ใช้ที่เลือก
  const userKey =
    selectedUser !== null ? users[selectedUser]?.Username ?? "" : "";
  const selectedRole =
    selectedUser !== null ? getUserRole(users[selectedUser]?.Role ?? "") : null;
  const hasRolePermission = (permission: Permission) =>
    selectedRole
      ? roleHasPermission(selectedRole, permission, roles)
      : false;

  // เปิด dialog กำหนดสิทธิ์ (เริ่มใหม่ทุกครั้ง)
  const openRoleDialog = () => {
    setSelectedUser(null);
    setDraft({});
    setShowRoleDialog(true);
  };

  // เลือกผู้ใช้ แล้วโหลดสิทธิ์เดิมมาเป็นร่าง
  const selectUser = (index: number) => {
    setSelectedUser(index);
    setDraft(perms[users[index].Username] ?? {});
  };

  // กด toggle แก้แค่ร่าง
  const toggle = (permission: Permission) => {
    setDraft((previous) => {
      const inherited = hasRolePermission(permission);
      const nextValue = !(previous[permission] ?? inherited);
      const next = { ...previous };
      if (nextValue === inherited) {
        delete next[permission];
      } else {
        next[permission] = nextValue;
      }
      return next;
    });
  };

  // กดบันทึกสิทธิ์ ค่อยเก็บจริง
  const handleSave = () => {
    if (!userKey) return;
    savePerms({ ...perms, [userKey]: draft });
    setShowRoleDialog(false);
  };

  // ===== ผู้ใช้ =====
  const toggleUserStatus = (index: number) => {
    if (!usersReady) return;
    setUsers((list) =>
      list.map((user, i) =>
        i === index ? { ...user, isActive: !user.isActive } : user,
      ),
    );
  };

  const addUser = () => {
    if (!usersReady) return;
    const newUser = {
      Name: name,
      Username: username,
      Password: password,
      Role: role,
      สาขา: branch,
      isActive: true,
    };

    setUsers((list) => [...list, newUser]);

    setName("");
    setUsername("");
    setPassword("");
    setRole("");
    setBranch("");

    setShowAddDialog(false);
  };

  return (
    <main className="w-full space-y-6">
      <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            การจัดการผู้ใช้งานและสิทธิ์
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            จัดการบัญชีผู้ใช้ บทบาท และสิทธิ์การเข้าถึงระบบ
          </p>
        </div>

        <div className="flex flex-wrap gap-3 sm:justify-end">
          {/* Dialog เพิ่มผู้ใช้ */}
          <Backdrop
            isOpen={showAddDialog}
            onOpenChange={setShowAddDialog}
            className="bg-black/40"
          >
            <Dialog className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-black shadow-xl">
              <DialogHeader>
                <DialogTitle >เพิ่มผู้ใช้งาน</DialogTitle>
              </DialogHeader>

              <DialogBody>
                <div className="flex flex-col gap-4">
                  <TextField className="flex flex-col gap-1.5">
                    <Label>ชื่อ-นามสกุล</Label>
                    <Input
                      placeholder="กรอกชื่อ-นามสกุล"
                      className="w-full"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </TextField>

                  <TextField className="flex flex-col gap-1.5">
                    <Label>Username</Label>
                    <Input
                      placeholder="กรอก Username"
                      className="w-full"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </TextField>

                  <TextField className="flex flex-col gap-1.5">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      placeholder="กรอก Password"
                      className="w-full"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </TextField>

                  <TextField className="flex flex-col gap-1.5">
                    <Label>Role</Label>
                    <Input
                      placeholder="เช่น Admin"
                      className="w-full"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                    />
                  </TextField>

                  <TextField className="flex flex-col gap-1.5">
                    <Label>สาขา</Label>
                    <Input
                      placeholder="เช่น สาขา 1"
                      className="w-full"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                    />
                  </TextField>
                </div>
              </DialogBody>

              <DialogFooter>
                <DialogClose className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">ยกเลิก</DialogClose>
                <Button
                  variant="primary"
                  className="bg-[#00877E] hover:bg-[#00786F]"
                  onClick={addUser}
                >
                  เพิ่มผู้ใช้งาน
                </Button>
              </DialogFooter>
            </Dialog>
          </Backdrop>

          {/* Dialog กำหนดสิทธิ์ผู้ใช้งาน */}
          <Backdrop
            isOpen={showRoleDialog}
            onOpenChange={setShowRoleDialog}
            className="bg-black/40"
          >
            <Dialog className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 text-black shadow-xl">
              <DialogHeader>
                <DialogTitle>กำหนดสิทธิ์ผู้ใช้งาน</DialogTitle>
              </DialogHeader>

              <DialogBody>
                <div className="flex flex-col gap-4">
                  {/* เลือกผู้ใช้ */}
                  <div className="w-full max-w-xs">
                    <label className="mb-2 block text-sm font-medium">
                      เลือกผู้ใช้งาน
                    </label>

                    <Combobox>
                      <ComboboxInputWrapper>
                        <ComboboxInput placeholder="ค้นหาผู้ใช้งาน..." />
                        <ComboboxTrigger />
                      </ComboboxInputWrapper>

                      <ComboboxContent>
                        <ComboboxList>
                          {users.map((user, index) => (
                            <ComboboxItem
                              key={`${user.Username}-${index}`}
                              id={`${user.Username}-${index}`}
                              onClick={() => selectUser(index)}
                            >
                              {user.Name}
                            </ComboboxItem>
                          ))}
                        </ComboboxList>

                        <ComboboxEmpty>ไม่พบผู้ใช้งาน</ComboboxEmpty>
                      </ComboboxContent>
                    </Combobox>
                  </div>

                  {/* ตารางสิทธิ์ */}
                  {selectedUser === null ? (
                    <p className="text-sm text-gray-500">
                      กรุณาเลือกผู้ใช้งานก่อน
                    </p>
                  ) : (
                    <div className="max-h-96 overflow-auto rounded-xl border border-slate-200 bg-white">
                      <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-50">
                          <tr className="text-sm font-semibold text-slate-600">
                            <th className="px-4 py-3">เมนู</th>
                            <th className="px-4 py-3 text-center">อนุญาต</th>
                          </tr>
                        </thead>
                        <tbody>
                          {USER_MANAGED_PERMISSIONS.map(
                            ({ label, permission }) => (
                            <tr
                              key={permission}
                              className="border-t border-slate-100 hover:bg-teal-50/40"
                            >
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {label}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Switch
                                  checked={
                                    draft[permission] ??
                                    hasRolePermission(permission)
                                  }
                                  onChange={() => toggle(permission)}
                                />
                              </td>
                            </tr>
                            ),
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </DialogBody>

              <DialogFooter>
                <DialogClose className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">ปิด</DialogClose>
                <Button
                  variant="primary"
                  className="bg-[#00877E] hover:bg-[#00786F]"
                  onClick={handleSave}
                >
                  บันทึกสิทธิ์
                </Button>
              </DialogFooter>
            </Dialog>
          </Backdrop>

          {/* ปุ่มเปิด Dialog */}
          <Button
            variant="primary"
            size="sm"
            className="!bg-[#00877E] hover:!bg-[#00786F]"
            disabled={!usersReady}
            onClick={() => setShowAddDialog(true)}
          >
            + เพิ่มผู้ใช้งานใหม่
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="!bg-[#00877E] hover:!bg-[#00786F]"
            disabled={!permissionsReady}
            onClick={openRoleDialog}
          >
            กำหนดสิทธิ์ผู้ใช้งาน
          </Button>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">ผู้ใช้งานทั้งหมด</p>
          <p className="mt-3 text-3xl font-bold text-slate-800">
            {users.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">กำลังใช้งาน</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {activeUsers.filter(Boolean).length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">ระงับการใช้งาน</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {activeUsers.filter((active) => !active).length}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-800">รายชื่อผู้ใช้งาน</h2>
          <p className="mt-1 text-sm text-slate-500">
            จัดการบทบาท สาขา และสถานะบัญชี
          </p>
        </div>

        <div className="w-full overflow-x-auto">
          <TableRoot fullBleed className="min-w-[800px] text-sm">
            <TableHeader className="bg-slate-50">
              <TableRow className="border-b-slate-200 [&>th]:font-semibold [&>th]:text-slate-600">
                <TableHead scope="col">ชื่อ-นามสกุล</TableHead>
                <TableHead scope="col">Username</TableHead>
                <TableHead scope="col">Password</TableHead>
                <TableHead scope="col">Role</TableHead>
                <TableHead scope="col">สาขา</TableHead>
                <TableHead scope="col" className="text-center">
                  สถานะ
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100">
              {users.map((item, index) => (
                <TableRow
                  key={`${item.Username}-${index}`}
                  className="transition hover:bg-teal-50/40"
                >
                  <TableCell
                    scope="row"
                    className="whitespace-nowrap font-medium text-slate-800"
                  >
                    {item.Name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {item.Username}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {item.Password}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium text-slate-700">
                    {item.Role}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-600">
                    {item.สาขา}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-center">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!usersReady}
                      className={
                        activeUsers[index]
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-red-600 hover:bg-red-700"
                      }
                      onClick={() => toggleUserStatus(index)}
                    >
                      {activeUsers[index] ? "กำลังใช้งาน" : "ระงับการใช้งาน"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableRoot>
        </div>
      </section>
    </main>
  );
}

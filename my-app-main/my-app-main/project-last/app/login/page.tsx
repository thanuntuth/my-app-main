"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLE_HOME } from "@/lib/permissions";
import { KEYS } from "@/lib/storage";
import { RoleId } from "@/lib/types";

const users = [
  { username: "super", password: "1234", role: "super-admin" },
  { username: "admin", password: "1234", role: "admin" },
  { username: "store", password: "1234", role: "store" },
];

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find((u) => u.username === username && u.password === password);
    if (!user) {
      setError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    localStorage.setItem("currentUser", user.username);
    localStorage.setItem(KEYS.username, JSON.stringify(user.username));

    localStorage.setItem(KEYS.role, JSON.stringify(user.role));
    router.push(ROLE_HOME[user.role as RoleId]);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center p-6">
      <form onSubmit={submit} className="space-y-3 rounded-lg border p-5">
        <h1 className="text-xl font-semibold">เข้าสู่ระบบ</h1>
        <label className="block text-sm">
          ชื่อผู้ใช้
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        </label>
        <label className="block text-sm">
          รหัสผ่าน
          <input
            type="password"
            className="mt-1 w-full rounded border px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-teal-700 px-4 py-2 text-white">
          เข้าสู่ระบบ
        </button>
      </form>
    </main>
  );
}
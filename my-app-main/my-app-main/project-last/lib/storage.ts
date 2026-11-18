"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { sampleAssets, sampleBranches } from "./sampleData";
import { Asset, Branch, CountRound, LogEntry, Movement, Repair, Vendor } from "./types";
import { ROLE_LABEL } from "./permissions";

// ชื่อ key ที่ใช้ใน localStorage 
export const KEYS = {
  assets: "assets",
  branches: "branches",
  rounds: "rounds", // เก็บทุกรอบตรวจนับ (เดิมคือ "round" รอบเดียว)
  moves: "moves",
  logs: "logs",
  repairs: "repairs",
  roles: "roles",
  roleUsers: "roleUsers",
  permissions: "permissions",
  role: "role", // role ของคนที่ล็อกอินอยู่
  username: "username",
  selectedAsset: "selectedAssetId",
  vendors: "vendors",
} as const;

type Updater<T> = T | ((prev: T) => T);

/** state ที่จำค่าไว้ใน localStorage
 *  เขียนลง localStorage เฉพาะตอนเรียก set เท่านั้น (ไม่เขียนอัตโนมัติ จึงไม่ทับค่าโดยไม่ตั้งใจ)
 *  ready = false จนกว่าจะอ่านค่าจากเบราว์เซอร์เสร็จ */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  const ref = useRef<T>(initial);
  const initialRef = useRef<T>(initial);

  useEffect(() => {
    const saved = localStorage.getItem(key);
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved) as T;
        ref.current = parsed;
        // Hydrate the shared state with the value read from browser storage.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setValue(parsed);
      } catch {
        console.warn(`localStorage "${key}" ไม่ใช่ JSON:`, saved);
      }
    }
    setReady(true);

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;

      if (event.key === null || event.newValue === null) {
        ref.current = initialRef.current;
        setValue(initialRef.current);
        return;
      }

      try {
        const parsed = JSON.parse(event.newValue) as T;
        ref.current = parsed;
        setValue(parsed);
      } catch {
        console.warn(`localStorage "${key}" ไม่ใช่ JSON:`, event.newValue);
      }
    };

    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, [key]);

  const set = useCallback(
    (next: Updater<T>) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(ref.current) : next;
      ref.current = resolved;
      setValue(resolved);
      localStorage.setItem(key, JSON.stringify(resolved));
    },
    [key]
  );

  return [value, set, ready] as const;
}

/** รอบปัจจุบัน = รอบแรกที่ยังไม่ปิด ถ้าไม่มีให้ใช้รอบล่าสุด */
function currentIndex(list: CountRound[]) {
  const open = list.findIndex((r) => r.status !== "closed");
  return open >= 0 ? open : list.length - 1;
}

/** ข้อมูลหลักของระบบ ทุกหน้าใช้ตัวนี้ */
export function useAppData() {
const [assets, setAssets, assetsReady] = useLocalState<Asset[]>(KEYS.assets, sampleAssets);
const [branches, , branchesReady] = useLocalState<Branch[]>(KEYS.branches, sampleBranches);
const [rounds, setRounds, roundsReady] = useLocalState<CountRound[]>(KEYS.rounds, []);
const [moves, setMoves, movesReady] = useLocalState<Movement[]>(KEYS.moves, []);
const [logs, setLogs, logsReady] = useLocalState<LogEntry[]>(KEYS.logs, []);
const [repairs, setRepairs, repairsReady] = useLocalState<Repair[]>(KEYS.repairs, []);
const [vendors, setVendors, vendorsReady] = useLocalState<Vendor[]>(KEYS.vendors, []);

const ready =
  assetsReady &&
  branchesReady &&
  roundsReady &&
  movesReady &&
  logsReady &&
  repairsReady &&
  vendorsReady;

  const log = (who: string, action: string) => {
    let actor = who;
    const savedRole = localStorage.getItem(KEYS.role);

    if (savedRole) {
      try {
        const role: unknown = JSON.parse(savedRole);
        if (
          typeof role === "string" &&
          Object.prototype.hasOwnProperty.call(ROLE_LABEL, role)
        ) {
          actor = ROLE_LABEL[role as keyof typeof ROLE_LABEL];
        }
      } catch (error) {
        console.warn(`localStorage "${KEYS.role}" ไม่ใช่ JSON:`, error);
      }
    }

    setLogs((l) =>
      [{ at: new Date().toISOString(), who: actor, action }, ...l].slice(0, 200)
    );
  };

  const addVendor = (data: Omit<Vendor, "id">) => {
    const newVendor: Vendor = {
      id: Date.now().toString(),
      ...data,
    };

    setVendors((prev) => [...prev, newVendor]);
    log("Admin", `เพิ่มผู้จำหน่าย ${data.name}`);
    return true;
  };

  // รอบปัจจุบัน: หน้า checklist / ตรวจผลนับ / นับของ Store ใช้ตัวนี้เหมือนเดิม
  const round: CountRound | null = rounds[currentIndex(rounds)] ?? null;

  // อัปเดตรอบปัจจุบัน (ใช้เหมือน setRound เดิม)
  const setRound = (next: CountRound) =>
    setRounds((prev) => {
      const i = currentIndex(prev);
      return i < 0
        ? prev
        : prev.map((r, k) =>
            k === i ? { ...next, id: r.id, name: r.name, branch: r.branch } : r
          );
    });

  const setRoundById = (id: number, next: CountRound) =>
    setRounds((prev) =>
      prev.map((r) =>
        r.id === id ? { ...next, id: r.id, name: r.name, branch: r.branch } : r
      )
    );

  // สร้างรอบใหม่ (หน้ากำหนดวันตรวจนับ) เพิ่มได้หลายรอบพร้อมกัน
  // branch เป็นค่าเสริม หน้าอื่นที่เรียกด้วย 2 อาร์กิวเมนต์ยังใช้ได้
  const addRound = (name: string, date: string, branch = "") => {
    const id = rounds.reduce((m, r) => Math.max(m, r.id), 0) + 1;
    setRounds([
      ...rounds,
      { id, name, branch, date, status: "open", results: {}, extras: [] },
    ]);
    log(
      "Super admin",
      `กำหนดรอบตรวจนับ ${name}${branch ? ` สาขา ${branch}` : ""} วันที่ ${date}`
    );
    return true;
  };

  // ลบรอบ ทำได้เฉพาะรอบที่ยังไม่เริ่มนับ
  const deleteRound = (id: number) => {
    const r = rounds.find((x) => x.id === id);
    if (!r || r.status !== "open" || Object.keys(r.results).length > 0) return false;
    setRounds(rounds.filter((x) => x.id !== id));
    log("Super admin", `ลบรอบตรวจนับ ${r.name}`);
    return true;
  };

  return {
    assets, setAssets, branches,
    rounds, round, setRound, setRoundById, addRound, deleteRound, ready,
    moves, setMoves, logs, log, repairs, setRepairs,
    vendors, setVendors, addVendor,
  };
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sampleAssets, sampleBranches } from "./sampleData";
import type {
  Asset,
  Branch,
  CountRound,
  LogEntry,
  Movement,
  Repair,
  Vendor,
} from "./types";
import { ROLE_LABEL } from "./permissions";

// ชื่อ key ที่ใช้ใน localStorage
export const KEYS = {
  assets: "assets",
  branches: "branches",
  rounds: "rounds",
  moves: "moves",
  logs: "logs",
  repairs: "repairs",
  roles: "roles",
  roleUsers: "roleUsers",
  permissions: "permissions",
  role: "role",
  username: "username",
  selectedAsset: "selectedAssetId",
  vendors: "vendors",
} as const;

type Updater<T> = T | ((prev: T) => T);

// -------------------------------------
// ระบบจัดเก็บรูปภาพด้วย IndexedDB
// -------------------------------------

const DB_NAME = "asset-management-images";
const DB_VERSION = 1;
const IMAGE_STORE = "asset-images";

type StoredImage = {
  id: string;
  image: string;
};

function openImageDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("เบราว์เซอร์ไม่รองรับ IndexedDB"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(IMAGE_STORE)) {
        db.createObjectStore(IMAGE_STORE, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// โหลดรูปภาพทั้งหมด
async function getStoredImages(): Promise<Map<string, string>> {
  const db = await openImageDB();

  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, "readonly");
      const store = transaction.objectStore(IMAGE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = new Map<string, string>();

        (request.result as StoredImage[]).forEach((item) => {
          result.set(item.id, item.image);
        });

        resolve(result);
      };

      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

// บันทึกและลบรูปภาพตาม ID
async function persistAssets(assets: Asset[]): Promise<void> {
  const db = await openImageDB();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(IMAGE_STORE, "readwrite");
      const store = transaction.objectStore(IMAGE_STORE);

      assets.forEach((asset) => {
        if (typeof asset.image === "string" && asset.image) {
          store.put({
            id: asset.id,
            image: asset.image,
          } satisfies StoredImage);
        } else {
          store.delete(asset.id);
        }
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("บันทึกรูปภาพไม่สำเร็จ"));
    });

    // เก็บเฉพาะข้อมูลที่ไม่ใช่รูปภาพใน localStorage
    const assetsWithoutImages = assets.map((asset) => {
      const { image, ...data } = asset;
      return data;
    });

    localStorage.setItem(
      KEYS.assets,
      JSON.stringify(assetsWithoutImages)
    );
  } finally {
    db.close();
  }
}

// โหลดข้อมูลทรัพย์สินพร้อมรูปภาพจาก IndexedDB
async function hydrateAssets(assets: Asset[]): Promise<Asset[]> {
  const images = await getStoredImages();

  return assets.map((asset) => ({
    ...asset,
    image:
      images.get(asset.id) ??
      (typeof asset.image === "string" ? asset.image : undefined),
  }));
}

// อ่านข้อมูลเก่าและย้ายรูปภาพจาก localStorage ไป IndexedDB
async function loadAssets(): Promise<Asset[]> {
  const saved = localStorage.getItem(KEYS.assets);

  if (saved === null) {
    return sampleAssets;
  }

  let parsed: Asset[];

  try {
    parsed = JSON.parse(saved) as Asset[];
  } catch {
    console.warn("ข้อมูลทรัพย์สินใน localStorage ไม่ใช่ JSON");
    return sampleAssets;
  }

  if (!Array.isArray(parsed)) {
    return sampleAssets;
  }

  // ย้ายรูปเก่าที่เคยเก็บใน localStorage ไป IndexedDB
  const hasOldImages = parsed.some(
    (asset) =>
      typeof asset.image === "string" && asset.image.length > 0
  );

  if (hasOldImages) {
    await persistAssets(parsed);
  }

  return hydrateAssets(parsed);
}

// -------------------------------------
// Hook สำหรับเก็บข้อมูลใน localStorage
// -------------------------------------

export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);

  const ref = useRef<T>(initial);
  const initialRef = useRef<T>(initial);

  // คิวบันทึก ป้องกันการเขียนข้อมูลชนกัน
  const writeQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        let loadedValue: T;

        if (key === KEYS.assets) {
          loadedValue = (await loadAssets()) as T;
        } else {
          const saved = localStorage.getItem(key);

          if (saved !== null) {
            try {
              loadedValue = JSON.parse(saved) as T;
            } catch {
              console.warn(`localStorage "${key}" ไม่ใช่ JSON`);
              loadedValue = initialRef.current;
            }
          } else {
            loadedValue = initialRef.current;
          }
        }

        if (!active) return;

        ref.current = loadedValue;
        setValue(loadedValue);
      } catch (error) {
        console.error(`โหลดข้อมูล ${key} ไม่สำเร็จ:`, error);

        if (!active) return;

        // ถ้าโหลดรูปไม่ได้ ยังแสดงข้อมูลทรัพย์สินได้
        if (key === KEYS.assets) {
          const saved = localStorage.getItem(key);

          if (saved) {
            try {
              const parsed = JSON.parse(saved) as T;
              ref.current = parsed;
              setValue(parsed);
            } catch {
              ref.current = initialRef.current;
              setValue(initialRef.current);
            }
          }
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void load();

    const syncFromStorage = async (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;

      try {
        if (event.key === null || event.newValue === null) {
          const resetValue = initialRef.current;

          ref.current = resetValue;
          setValue(resetValue);
          return;
        }

        let parsed: T = JSON.parse(event.newValue) as T;

        if (key === KEYS.assets) {
          parsed = (await hydrateAssets(parsed as Asset[])) as T;
        }

        ref.current = parsed;
        setValue(parsed);
      } catch (error) {
        console.error(`ซิงก์ข้อมูล ${key} ไม่สำเร็จ:`, error);
      }
    };

    window.addEventListener("storage", syncFromStorage);

    return () => {
      active = false;
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [key]);

  const set = useCallback(
    (next: Updater<T>) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(ref.current)
          : next;

      ref.current = resolved;
      setValue(resolved);

      if (key === KEYS.assets) {
        const assets = resolved as Asset[];

        writeQueueRef.current = writeQueueRef.current
          .then(() => persistAssets(assets))
          .catch((error) => {
            console.error("บันทึกทรัพย์สินไม่สำเร็จ:", error);
          });

        return;
      }

      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch (error) {
        console.error(`บันทึก localStorage "${key}" ไม่สำเร็จ:`, error);
        throw error;
      }
    },
    [key]
  );

  return [value, set, ready] as const;
}

// -------------------------------------
// ข้อมูลหลักของระบบ
// -------------------------------------

function currentIndex(list: CountRound[]) {
  const open = list.findIndex((r) => r.status !== "closed");
  return open >= 0 ? open : list.length - 1;
}

export function useAppData() {
  const [assets, setAssets, assetsReady] =
    useLocalState<Asset[]>(KEYS.assets, sampleAssets);

  const [branches, , branchesReady] =
    useLocalState<Branch[]>(KEYS.branches, sampleBranches);

  const [rounds, setRounds, roundsReady] =
    useLocalState<CountRound[]>(KEYS.rounds, []);

  const [moves, setMoves, movesReady] =
    useLocalState<Movement[]>(KEYS.moves, []);

  const [logs, setLogs, logsReady] =
    useLocalState<LogEntry[]>(KEYS.logs, []);

  const [repairs, setRepairs, repairsReady] =
    useLocalState<Repair[]>(KEYS.repairs, []);

  const [vendors, setVendors, vendorsReady] =
    useLocalState<Vendor[]>(KEYS.vendors, []);

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
        console.warn(
          `localStorage "${KEYS.role}" ไม่ใช่ JSON:`,
          error
        );
      }
    }

    setLogs((list) =>
      [
        {
          at: new Date().toISOString(),
          who: actor,
          action,
        },
        ...list,
      ].slice(0, 200)
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

  // รอบปัจจุบัน
  const round: CountRound | null =
    rounds[currentIndex(rounds)] ?? null;

  // อัปเดตรอบปัจจุบัน
  const setRound = (next: CountRound) =>
    setRounds((prev) => {
      const i = currentIndex(prev);

      return i < 0
        ? prev
        : prev.map((r, k) =>
            k === i
              ? {
                  ...next,
                  id: r.id,
                  name: r.name,
                  branch: r.branch,
                }
              : r
          );
    });

  const setRoundById = (id: number, next: CountRound) =>
    setRounds((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...next,
              id: r.id,
              name: r.name,
              branch: r.branch,
            }
          : r
      )
    );

  // สร้างรอบใหม่
  const addRound = (name: string, date: string, branch = "") => {
    const id =
      rounds.reduce((max, r) => Math.max(max, r.id), 0) + 1;

    setRounds([
      ...rounds,
      {
        id,
        name,
        branch,
        date,
        status: "open",
        results: {},
        extras: [],
      },
    ]);

    log(
      "Super admin",
      `กำหนดรอบตรวจนับ ${name}${
        branch ? ` สาขา ${branch}` : ""
      } วันที่ ${date}`
    );

    return true;
  };

  // ลบรอบที่ยังไม่เริ่มนับ
  const deleteRound = (id: number) => {
    const r = rounds.find((x) => x.id === id);

    if (
      !r ||
      r.status !== "open" ||
      Object.keys(r.results).length > 0
    ) {
      return false;
    }

    setRounds(rounds.filter((x) => x.id !== id));
    log("Super admin", `ลบรอบตรวจนับ ${r.name}`);

    return true;
  };

  return {
    assets,
    setAssets,
    branches,
    rounds,
    round,
    setRound,
    setRoundById,
    addRound,
    deleteRound,
    ready,
    moves,
    setMoves,
    logs,
    log,
    repairs,
    setRepairs,
    vendors,
    setVendors,
    addVendor,
  };
}

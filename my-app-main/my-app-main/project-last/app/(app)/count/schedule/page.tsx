"use client";

import { useMemo, useState } from "react";

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
import { RESULT_LABEL, ROUND_LABEL } from "@/lib/labels";
import { useAppData } from "@/lib/storage";
import { Asset, Branch, CountRound } from "@/lib/types";


const STATUS_COLOR = {
  open: "bg-amber-50 text-amber-700",
  review: "bg-blue-50 text-blue-700",
  closed: "bg-emerald-50 text-emerald-700",
};

function getRoundAssets(
  assets: Asset[],
  branches: Branch[],
  round: CountRound | null | undefined,
) {
  if (!round) return [];

  const checklistAssetIds = (round.checklists ?? []).flatMap(
    (checklist) => checklist.assetIds,
  );
  if (checklistAssetIds.length > 0) {
    return assets.filter((asset) => checklistAssetIds.includes(asset.id));
  }

  const selectedBranch = branches.find(
    (branch) => branch.id === round.branch || branch.name === round.branch,
  );

  return assets.filter(
    (asset) =>
      asset.status !== "in-transit" &&
      (!round.branch || asset.branchId === (selectedBranch?.id ?? round.branch)),
  );
}

export default function Page() {
  const { assets, rounds, round, addRound, deleteRound, branches, ready } = useAppData();
  const [keyword, setKeyword] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState("");
  const [formError, setFormError] = useState("");

  const countBranches = branches.filter((branch) => branch.id !== "hq");
  const nextId = rounds.reduce((max, round) => Math.max(max, round.id), 0) + 1;
  const currentRoundAssets = useMemo(() => {
    return getRoundAssets(assets, branches, round);
  }, [assets, branches, round]);
  const selectedRound = rounds.find((item) => item.id === selectedRoundId);
  const selectedRoundAssets = useMemo(
    () => getRoundAssets(assets, branches, selectedRound),
    [assets, branches, selectedRound],
  );
  const selectedRoundCountedAssets = selectedRoundAssets.filter(
    (asset) => Boolean(selectedRound?.results[asset.id]),
  ).length;
  const countedAssets = currentRoundAssets.filter(
    (asset) => Boolean(round?.results[asset.id]),
  ).length;
  const remainingAssets = currentRoundAssets.length - countedAssets;
  const progress =
    currentRoundAssets.length > 0
      ? Math.round((countedAssets / currentRoundAssets.length) * 100)
      : 0;
  const filteredRounds = useMemo(() => {
    const search = keyword.trim().toLowerCase();
    return rounds.filter(
      (round) =>
        round.name.toLowerCase().includes(search) ||
        round.date.toLowerCase().includes(search) ||
        (round.branch ?? "").toLowerCase().includes(search),
    );
  }, [keyword, rounds]);

  const closeDialog = () => {
    setShowDialog(false);
    setFormError("");
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const selectedBranch =
      branchId === "all"
        ? undefined
        : countBranches.find((branch) => branch.id === branchId);

    if (!name.trim() || !date || (branchId !== "all" && !selectedBranch)) {
      setFormError("กรุณากรอกชื่อรอบและวันที่ตรวจนับให้ครบ");
      return;
    }

    addRound(name.trim(), date, selectedBranch?.name ?? "");
    setName("");
    setBranchId("all");
    setDate("");
    closeDialog();
  };

  return (
    <main className="w-full space-y-6">
    <header className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:flex-row sm:items-center sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">กำหนดรอบการตรวจนับ</h1>
        <p className="mt-1 text-sm text-slate-500">
          จัดการกำหนดเวลาและติดตามรอบตรวจนับทรัพย์สิน
        </p>
      </div>
      <Button
        className="h-auto rounded-xl bg-[#00786F] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00665F]"
        onClick={() => {
          setName("");
          setBranchId("all");
            setDate("");
            setFormError("");
            setShowDialog(true);
          }}
        >
          + สร้างรอบตรวจนับ
        </Button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5">
          <h2 className="text-lg font-bold text-slate-800">
            ภาพรวมการตรวจนับปัจจุบัน
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {round
              ? `${round.name} · ${round.branch || "ทุกสาขา"} · ${round.date}`
              : "ยังไม่มีรอบตรวจนับ"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">ทรัพย์สินในรอบนี้</p>
          <p className="mt-3 text-3xl font-bold text-slate-800">{currentRoundAssets.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">ตรวจนับแล้ว</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {countedAssets}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">รอตรวจนับ</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {remainingAssets}
          </p>
        </div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-sm text-slate-500">
            <span>ความคืบหน้ารอบตรวจนับ</span>
            <span>{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="ความคืบหน้ารอบตรวจนับ"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-[#00786F] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800">ข้อมูลรอบตรวจนับ</h2>
            <p className="mt-1 text-sm text-slate-500">รายการรอบตรวจนับที่บันทึกไว้ในระบบ</p>
          </div>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="ค้นหาชื่อรอบ สาขา หรือวันที่..."
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#00786F] focus:ring-4 focus:ring-teal-50 sm:max-w-sm"
          />
        </div>

        <div className="mt-5 w-full overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[750px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="w-24 px-5 py-4 text-center font-semibold">ID</th>
                <th className="px-5 py-4 font-semibold">ชื่อรอบตรวจนับ</th>
                <th className="px-5 py-4 font-semibold">สาขา</th>
                <th className="px-5 py-4 font-semibold">วันที่</th>
                <th className="px-5 py-4 text-center font-semibold">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {!ready ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : filteredRounds.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    ไม่พบรอบตรวจนับ
                  </td>
                </tr>
              ) : (
                filteredRounds.map((round) => (
                  <tr key={round.id} className="transition hover:bg-teal-50/40">
                    <td className="px-5 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRoundId(round.id)}
                        aria-label={`ดูรายละเอียดรอบตรวจนับ ${round.id}`}
                        className="inline-flex cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-teal-100 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00786F]"
                      >
                        #{round.id}
                      </button>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">{round.name}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                      {round.branch || "ทุกสาขา"}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{round.date}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${STATUS_COLOR[round.status]}`}>
                          {ROUND_LABEL[round.status]}
                        </span>
                        {round.status === "open" && Object.keys(round.results).length === 0 && (
                          <Button
                            variant="danger"
                            onClick={() => deleteRound(round.id)}
                            className="h-8 rounded-lg px-3 text-xs"
                          >
                            ลบ
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          * รอบที่เลือกทุกสาขาจะแสดงให้ทุกสาขาใช้ตรวจนับ
        </p>
      </section>

      <Backdrop
        isOpen={showDialog}
        onOpenChange={setShowDialog}
        className="bg-black/40"
      >
        <Dialog className="w-full max-w-lg rounded-lg bg-white p-6 text-black shadow-lg">
          <DialogHeader>
            <DialogTitle>สร้างรอบตรวจนับ</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <form id="create-round-form" onSubmit={submit} className="space-y-4">
              <TextField className="flex flex-col gap-1.5">
                <Label>ID รอบตรวจนับ</Label>
                <Input value={String(nextId)} readOnly className="w-full" />
              </TextField>
              <TextField isRequired className="flex flex-col gap-1.5">
                <Label>ชื่อรอบตรวจนับ</Label>
                <Input
                  autoFocus
                  placeholder="เช่น รอบตรวจนับประจำเดือนมกราคม 2026"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value);
                    setFormError("");
                  }}
                  className="w-full"
                />
              </TextField>
              <TextField isRequired className="flex flex-col gap-1.5">
                <Label>สาขา</Label>
                <select
                  required
                  value={branchId}
                  onChange={(event) => {
                    setBranchId(event.target.value);
                    setFormError("");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-[#00786F] focus:ring-4 focus:ring-teal-50"
                >
                  <option value="all">ทุกสาขา</option>
                  {countBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </TextField>
              <TextField isRequired className="flex flex-col gap-1.5">
                <Label>วันที่ตรวจนับ</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setFormError("");
                  }}
                  className="w-full"
                />
              </TextField>
              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}
            </form>
          </DialogBody>
          <DialogFooter>
            <DialogClose className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" onClick={closeDialog}>
              ยกเลิก
            </DialogClose>
            <Button type="submit" form="create-round-form">
              บันทึกรอบตรวจนับ
            </Button>
          </DialogFooter>
        </Dialog>
      </Backdrop>

      <Backdrop
        isOpen={selectedRoundId !== null && Boolean(selectedRound)}
        onOpenChange={(isOpen) => {
          if (!isOpen) setSelectedRoundId(null);
        }}
        className="bg-black/40"
      >
        {selectedRound && (
          <Dialog className="w-full max-w-3xl rounded-lg bg-white p-6 text-black shadow-lg">
            <DialogHeader>
              <DialogTitle>รายละเอียดรอบตรวจนับ #{selectedRound.id}</DialogTitle>
              <p className="text-sm text-slate-500">{selectedRound.name}</p>
            </DialogHeader>
            <DialogBody className="max-h-[70vh] space-y-5 overflow-y-auto">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">สาขา</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedRound.branch || "ทุกสาขา"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">วันที่ตรวจนับ</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {selectedRound.date}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-500">สถานะ</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLOR[selectedRound.status]}`}
                  >
                    {ROUND_LABEL[selectedRound.status]}
                  </span>
                </div>
              </div>

              <section>
                <h3 className="mb-2 font-semibold text-slate-800">
                  ผลการตรวจนับ ({selectedRoundCountedAssets}/{selectedRoundAssets.length})
                </h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-3 font-semibold">รหัสทรัพย์สิน</th>
                        <th className="px-4 py-3 font-semibold">ชื่อทรัพย์สิน</th>
                        <th className="px-4 py-3 font-semibold">ผลตรวจนับ</th>
                        <th className="px-4 py-3 font-semibold">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedRoundAssets.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                            ไม่มีทรัพย์สินในรอบนี้
                          </td>
                        </tr>
                      ) : (
                        selectedRoundAssets.map((asset) => {
                          const result = selectedRound.results[asset.id];
                          return (
                            <tr key={asset.id}>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                {asset.id}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {asset.name}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                                {result ? RESULT_LABEL[result.result] : "รอตรวจนับ"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {result?.note || "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {(selectedRound.checklists?.length ?? 0) > 0 && (
                <section>
                  <h3 className="mb-2 font-semibold text-slate-800">Checklist แยกตามสาขา</h3>
                  <div className="space-y-2">
                    {selectedRound.checklists?.map((checklist) => {
                      const checklistBranch = branches.find(
                        (branch) => branch.id === checklist.branchId,
                      );
                      return (
                        <div
                          key={checklist.branchId}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm"
                        >
                          <span className="font-medium text-slate-800">
                            {checklistBranch?.name ?? checklist.branchId}
                          </span>
                          <span className="text-slate-500">
                            {checklist.assetIds.length} รายการ ·{" "}
                            {checklist.status === "sent" ? "ส่งให้สาขาแล้ว" : "กำลังตรวจสอบ"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {selectedRound.extras.length > 0 && (
                <section>
                  <h3 className="mb-2 font-semibold text-slate-800">
                    ทรัพย์สินที่พบเพิ่มเติม ({selectedRound.extras.length})
                  </h3>
                  <ul className="space-y-2">
                    {selectedRound.extras.map((extra, index) => (
                      <li
                        key={`${extra.name}-${index}`}
                        className="rounded-xl border border-slate-200 px-4 py-3 text-sm"
                      >
                        <p className="font-medium text-slate-800">{extra.name}</p>
                        {extra.note && <p className="mt-1 text-slate-500">{extra.note}</p>}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </DialogBody>
            <DialogFooter>
              <DialogClose
                className="border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                onClick={() => setSelectedRoundId(null)}
              >
                ปิด
              </DialogClose>
            </DialogFooter>
          </Dialog>
        )}
      </Backdrop>
    </main>
  );
}

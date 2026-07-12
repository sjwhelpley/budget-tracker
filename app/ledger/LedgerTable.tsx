"use client";

import { useRef, useState, useTransition } from "react";
import { bulkSetCategory } from "@/app/actions/ledger";
import { useToast } from "@/app/components/Toaster";
import { TransactionRowMenu } from "@/app/ledger/TransactionRowMenu";
import {
  TRANSACTION_CATEGORIES,
  TRANSACTION_CATEGORY_LABELS,
  type TransactionCategoryValue,
} from "@/lib/categories";
import { money } from "@/lib/format";
import type { LedgerRow } from "@/lib/ledger";

type Props = {
  transactions: LedgerRow[];
  year: number;
  month: number;
  dateMin: string;
  dateMax: string;
};

export function LedgerTable({ transactions, year, month, dateMin, dateMax }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState<TransactionCategoryValue>("EXPENSES");
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const showToast = useToast();
  const [isPending, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openBulkEdit() {
    setBulkCategory("EXPENSES");
    dialogRef.current?.showModal();
  }

  function closeBulkEdit() {
    dialogRef.current?.close();
  }

  function saveBulkCategory() {
    const ids = Array.from(selected);
    startTransition(async () => {
      const fd = new FormData();
      for (const id of ids) fd.append("id", id);
      fd.set("category", bulkCategory);
      const result = await bulkSetCategory(fd);
      if (result && "error" in result) {
        showToast(result.error, "error");
      } else {
        showToast(`Updated ${ids.length} transaction${ids.length === 1 ? "" : "s"}`, "success");
        setSelected(new Set());
        closeBulkEdit();
      }
    });
  }

  return (
    <>
      {selected.size > 0 ? (
        <div className="mb-3 flex items-center gap-3">
          <span className="text-sm text-zinc-600">{selected.size} selected</span>
          <button
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
            onClick={openBulkEdit}
            type="button"
          >
            Edit category
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <th className="w-8 px-4 py-3" />
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Payee</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 text-right font-medium">Amount</th>
              <th className="px-4 py-3 text-right font-medium">
                Balance after
              </th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-zinc-500" colSpan={7}>
                  No transactions this month yet.
                </td>
              </tr>
            ) : (
              transactions.map((row) => {
                const amt = Number(row.amount);
                const dDisplay = row.occurredOn.toLocaleDateString("en-US", {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                  timeZone: "UTC",
                });
                const dIso = row.occurredOn.toISOString().slice(0, 10);
                const isCompleted = row.status === "COMPLETED";
                const isEstimated = row.status === "ESTIMATED";
                return (
                  <tr
                    className={`border-b border-zinc-100 ${
                      isEstimated
                        ? "bg-amber-50/60 hover:bg-amber-100/50"
                        : isCompleted
                          ? "bg-sky-50 hover:bg-sky-100/40"
                          : "hover:bg-zinc-50/80"
                    }`}
                    key={row.id}
                  >
                    <td className="px-4 py-2">
                      <input
                        checked={selected.has(row.id)}
                        onChange={() => toggle(row.id)}
                        type="checkbox"
                      />
                    </td>
                    <td className="px-4 py-2 font-mono text-zinc-700">
                      {dDisplay}
                    </td>
                    <td
                      className={`px-4 py-2 text-zinc-900 ${isEstimated ? "italic" : ""}`}
                    >
                      {row.payee}
                    </td>
                    <td className="px-4 py-2 text-zinc-700">
                      {TRANSACTION_CATEGORY_LABELS[row.category]}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono tabular-nums ${isEstimated ? "italic" : ""} ${
                        amt > 0
                          ? "text-emerald-700"
                          : amt < 0
                            ? "text-red-600"
                            : "text-zinc-800"
                      }`}
                    >
                      {money.format(amt)}
                    </td>
                    <td
                      className={`px-4 py-2 text-right font-mono tabular-nums text-zinc-800 ${isEstimated ? "italic" : ""}`}
                    >
                      {money.format(Number(row.balanceAfter))}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <TransactionRowMenu
                        amount={row.amount}
                        category={row.category}
                        dateMax={dateMax}
                        dateMin={dateMin}
                        id={row.id}
                        month={month}
                        occurredOnIso={dIso}
                        payee={row.payee}
                        status={row.status}
                        year={year}
                      />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <dialog className="rounded-xl border border-zinc-200 p-0 shadow-xl" ref={dialogRef}>
        <div className="w-[min(92vw,420px)] p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-semibold text-zinc-900">
              Edit category
            </h3>
            <button
              className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              onClick={closeBulkEdit}
              type="button"
            >
              <span className="sr-only">Close</span>✕
            </button>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700">
                Category for {selected.size} selected transaction{selected.size === 1 ? "" : "s"}
              </span>
              <select
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                onChange={(e) => setBulkCategory(e.target.value as TransactionCategoryValue)}
                value={bulkCategory}
              >
                {TRANSACTION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {TRANSACTION_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                onClick={closeBulkEdit}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={isPending}
                onClick={saveBulkCategory}
                type="button"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

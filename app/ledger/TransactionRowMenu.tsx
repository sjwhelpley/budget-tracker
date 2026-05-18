"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  copyTransactionToNextMonth,
  deleteTransaction,
  setTransactionStatus,
  updateTransaction,
} from "@/app/actions/ledger";
import { useToast } from "@/app/components/Toaster";

type Props = {
  id: string;
  year: number;
  month: number;
  payee: string;
  amount: string;
  occurredOnIso: string; // YYYY-MM-DD
  dateMin: string; // YYYY-MM-DD
  dateMax: string; // YYYY-MM-DD
  status: "NONE" | "COMPLETED" | "ESTIMATED";
};

export function TransactionRowMenu({
  id,
  year,
  month,
  payee,
  amount,
  occurredOnIso,
  dateMin,
  dateMax,
  status,
}: Props) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const titleId = useId();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const [draftPayee, setDraftPayee] = useState(payee);
  const [draftAmount, setDraftAmount] = useState(amount);
  const [draftDate, setDraftDate] = useState(occurredOnIso);

  const showToast = useToast();
  const [isPending, startTransition] = useTransition();

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function openMenu() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 192;
    const left = Math.min(
      Math.max(8, rect.right - width),
      Math.max(8, window.innerWidth - width - 8),
    );
    const top = Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 260));
    setMenuPos({ top, left });
    setIsMenuOpen(true);
  }

  function openEdit() {
    closeMenu();
    dialogRef.current?.showModal();
  }

  function closeEdit() {
    dialogRef.current?.close();
  }

  useEffect(() => {
    if (!isMenuOpen) return;

    function onDocMouseDown(event: MouseEvent) {
      const t = event.target as Node | null;
      if (!t) return;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      closeMenu();
    }

    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }

    function onViewportChange() {
      closeMenu();
    }

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onEscape);
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onEscape);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
    };
  }, [isMenuOpen]);

  function runAction(
    action: (fd: FormData) => Promise<{ error: string } | { success: true } | null>,
    fields: Record<string, string>,
    successMessage?: string,
  ) {
    closeMenu();
    startTransition(async () => {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      const result = await action(fd);
      if (result && "error" in result) showToast(result.error, "error");
      else if (successMessage) showToast(successMessage, "success");
    });
  }

  function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateTransaction(fd);
      if (result && "error" in result) {
        showToast(result.error, "error");
      } else {
        closeEdit();
      }
    });
  }

  return (
    <>
      <button
        className="inline-flex cursor-pointer items-center justify-center rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
        onClick={() => (isMenuOpen ? closeMenu() : openMenu())}
        ref={triggerRef}
        type="button"
      >
        <span className="sr-only">Open transaction menu</span>
        <span aria-hidden>⋮</span>
      </button>

      {isMenuOpen ? (
        <div
          className="fixed z-40"
          ref={menuRef}
          style={{ left: `${menuPos.left}px`, top: `${menuPos.top}px` }}
        >
          <div className="w-48 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
              onClick={openEdit}
              type="button"
            >
              Edit
            </button>

            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-50"
              disabled={isPending}
              onClick={() =>
                runAction(setTransactionStatus, {
                  id,
                  status: status === "COMPLETED" ? "NONE" : "COMPLETED",
                })
              }
              type="button"
            >
              {status === "COMPLETED" ? (
                <span className="text-sky-700">Mark completed ✓ (clear)</span>
              ) : (
                <span className="text-zinc-800">Mark completed</span>
              )}
            </button>

            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-50"
              disabled={isPending}
              onClick={() =>
                runAction(setTransactionStatus, {
                  id,
                  status: status === "ESTIMATED" ? "NONE" : "ESTIMATED",
                })
              }
              type="button"
            >
              {status === "ESTIMATED" ? (
                <span className="italic text-amber-700">Mark estimated ✓ (clear)</span>
              ) : (
                <span className="text-zinc-800">Mark estimated</span>
              )}
            </button>

            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
              disabled={isPending}
              onClick={() => runAction(copyTransactionToNextMonth, { id }, "Copied to next month!")}
              type="button"
            >
              Copy to next month
            </button>

            <div className="my-1 border-t border-zinc-100" />

            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              disabled={isPending}
              onClick={() => runAction(deleteTransaction, { id })}
              type="button"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      <dialog className="rounded-xl border border-zinc-200 p-0 shadow-xl" ref={dialogRef}>
        <div className="w-[min(92vw,520px)] p-5">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-base font-semibold text-zinc-900" id={titleId}>
              Edit transaction
            </h3>
            <button
              className="rounded-md px-2 py-1 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              onClick={closeEdit}
              type="button"
            >
              <span className="sr-only">Close</span>✕
            </button>
          </div>

          <form className="mt-4 grid gap-3" onSubmit={handleEditSubmit}>
            <input name="id" type="hidden" value={id} />
            <input name="year" type="hidden" value={year} />
            <input name="month" type="hidden" value={month} />

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700">Payee</span>
              <input
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                name="payee"
                onChange={(e) => setDraftPayee(e.target.value)}
                required
                type="text"
                value={draftPayee}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700">Amount (+ / −)</span>
              <input
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900"
                name="amount"
                onChange={(e) => setDraftAmount(e.target.value)}
                required
                type="text"
                value={draftAmount}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-zinc-700">Date</span>
              <input
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 [color-scheme:light]"
                max={dateMax}
                min={dateMin}
                name="occurredOn"
                onChange={(e) => setDraftDate(e.target.value)}
                required
                type="date"
                value={draftDate}
              />
            </label>

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
                onClick={closeEdit}
                type="button"
              >
                Cancel
              </button>
              <button
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                disabled={isPending}
                type="submit"
              >
                {isPending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}

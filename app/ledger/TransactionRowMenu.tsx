"use client";

import { useEffect, useId, useRef, useState } from "react";
import { deleteTransaction, setTransactionStatus, updateTransaction } from "@/app/actions/ledger";

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

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function openMenu() {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = 176;
    const left = Math.min(
      Math.max(8, rect.right - width),
      Math.max(8, window.innerWidth - width - 8),
    );
    const top = Math.min(rect.bottom + 6, Math.max(8, window.innerHeight - 220));
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

  function closeMenuSoon() {
    window.setTimeout(() => {
      closeMenu();
    }, 0);
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
          <div className="w-44 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">
          <button
            className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            onClick={openEdit}
            type="button"
          >
            Edit
          </button>

          <form action={setTransactionStatus} onSubmit={closeMenuSoon}>
            <input name="id" type="hidden" value={id} />
            <input
              name="status"
              type="hidden"
              value={status === "COMPLETED" ? "NONE" : "COMPLETED"}
            />
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-50"
              type="submit"
            >
              {status === "COMPLETED" ? (
                <span className="text-sky-700">Mark completed ✓ (clear)</span>
              ) : (
                <span className="text-zinc-800">Mark completed</span>
              )}
            </button>
          </form>

          <form action={setTransactionStatus} onSubmit={closeMenuSoon}>
            <input name="id" type="hidden" value={id} />
            <input
              name="status"
              type="hidden"
              value={status === "ESTIMATED" ? "NONE" : "ESTIMATED"}
            />
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-50"
              type="submit"
            >
              {status === "ESTIMATED" ? (
                <span className="italic text-amber-700">Mark estimated ✓ (clear)</span>
              ) : (
                <span className="text-zinc-800">Mark estimated</span>
              )}
            </button>
          </form>

          <div className="my-1 border-t border-zinc-100" />

          <form action={deleteTransaction} onSubmit={closeMenuSoon}>
            <input name="id" type="hidden" value={id} />
            <button
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              type="submit"
            >
              Delete
            </button>
          </form>
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

          <form action={updateTransaction} className="mt-4 grid gap-3" onSubmit={closeEdit}>
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
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                type="submit"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}


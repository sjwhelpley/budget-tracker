import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { setMonthBalances, setMonthOpening } from "@/app/actions/ledger";
import { AddTransactionForm } from "@/app/ledger/AddTransactionForm";
import { LedgerTable } from "@/app/ledger/LedgerTable";
import {
  dateInputBoundsForMonth,
  defaultDateInputValueForMonth,
  getLedgerState,
  shiftMonth,
  TRANSACTION_CATEGORY_LABELS,
} from "@/lib/ledger";
import { money } from "@/lib/format";

function parseMonth(search: { y?: string; m?: string }) {
  const now = new Date();
  const y = search.y ? Number.parseInt(search.y, 10) : now.getUTCFullYear();
  const m = search.m ? Number.parseInt(search.m, 10) : now.getUTCMonth() + 1;
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }
  return { year: y, month: m };
}

export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  const sp = await searchParams;
  const { year, month } = parseMonth(sp);
  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);

  const now = new Date();
  const isCurrentMonth = year === now.getUTCFullYear() && month === now.getUTCMonth() + 1;

  const state = await getLedgerState(session.user.id, year, month);
  const txDateDefault = defaultDateInputValueForMonth(year, month);
  const txDateBounds = dateInputBoundsForMonth(year, month);

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString(
    "en-US",
    {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  );
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Ledger
          </h1>
          <p className="text-sm text-zinc-500">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            href={`/ledger?y=${prev.year}&m=${prev.month}`}
          >
            ← Prev
          </Link>
          <Link
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            href={`/ledger?y=${next.year}&m=${next.month}`}
          >
            Next →
          </Link>
          {!isCurrentMonth ? (
            <Link
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              href="/ledger"
            >
              Return to this month
            </Link>
          ) : null}
          <Link
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
            href="/api/auth/signout"
          >
            Sign out
          </Link>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Month opening balance
        </h2>
        <form
          action={setMonthOpening}
          className="flex flex-wrap items-end gap-3"
          key={`opening-${year}-${month}`}
        >
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Balance at start of month</span>
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400"
              name="openingBalance"
              type="text"
              defaultValue={state.effectiveOpening}
              placeholder="1700.00"
              required
            />
          </label>
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            type="submit"
          >
            Save
          </button>
        </form>
        {!state.hasStoredOpening ? (
          <p className="mt-2 text-sm text-amber-800">
            No saved opening for this month yet—the field defaults to last
            month&apos;s closing balance. Adjust if needed, then save to store
            it for this month.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Add transaction
        </h2>
        <AddTransactionForm
          year={year}
          month={month}
          txDateDefault={txDateDefault}
          txDateBounds={txDateBounds}
          payeeSuggestions={state.payeeSuggestions}
        />
      </section>

      <section>
        <LedgerTable
          dateMax={txDateBounds.max}
          dateMin={txDateBounds.min}
          month={month}
          transactions={state.transactions}
          year={year}
        />
        <p className="mt-3 text-sm text-zinc-700">
          Closing balance for {monthLabel}:{" "}
          <span className="font-mono text-base font-semibold text-zinc-950 tabular-nums">
            {money.format(Number(state.closing))}
          </span>
        </p>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Totals by category — {monthLabel}
        </h2>
        <table className="w-full max-w-sm border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-600">
              <th className="py-2 font-medium">Category</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {state.categoryTotals.map(({ category, total }) => (
              <tr className="border-b border-zinc-100" key={category}>
                <td className="py-2 text-zinc-800">
                  {TRANSACTION_CATEGORY_LABELS[category]}
                </td>
                <td className="py-2 text-right font-mono tabular-nums text-zinc-900">
                  {money.format(Number(total))}
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-zinc-300 font-semibold text-zinc-900">
              <td className="py-2">Total Spending</td>
              <td className="py-2 text-right font-mono tabular-nums">
                {money.format(Number(state.negativeCategoriesTotal))}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">
          Savings &amp; Roth IRA balances
        </h2>
        <form
          action={setMonthBalances}
          className="flex flex-wrap items-end gap-3"
          key={`balances-${year}-${month}`}
        >
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Savings balance</span>
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400"
              name="savingsBalance"
              type="text"
              defaultValue={state.savingsBalance.effective}
              placeholder="5000.00"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Roth IRA balance</span>
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400"
              name="rothIraBalance"
              type="text"
              defaultValue={state.rothIraBalance.effective}
              placeholder="12000.00"
              required
            />
          </label>
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            type="submit"
          >
            Save
          </button>
        </form>
        {!state.savingsBalance.hasStored || !state.rothIraBalance.hasStored ? (
          <p className="mt-2 text-sm text-amber-800">
            No saved {[
              !state.savingsBalance.hasStored ? "savings" : null,
              !state.rothIraBalance.hasStored ? "Roth IRA" : null,
            ]
              .filter(Boolean)
              .join(" or ")}{" "}
            balance for this month yet—the field defaults to last
            month&apos;s. Adjust if needed, then save to store it for this
            month.
          </p>
        ) : null}
      </section>
    </div>
  );
}

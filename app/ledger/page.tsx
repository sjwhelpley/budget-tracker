import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { createTransaction, deleteTransaction, setMonthOpening } from "@/app/actions/ledger";
import {
  dateInputBoundsForMonth,
  defaultDateInputValueForMonth,
  getLedgerState,
  shiftMonth,
} from "@/lib/ledger";

function parseMonth(search: { y?: string; m?: string }) {
  const now = new Date();
  const y = search.y ? Number.parseInt(search.y, 10) : now.getUTCFullYear();
  const m = search.m ? Number.parseInt(search.m, 10) : now.getUTCMonth() + 1;
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
  }
  return { year: y, month: m };
}

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

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

  const state = await getLedgerState(session.user.id, year, month);
  const txDateDefault = defaultDateInputValueForMonth(year, month);
  const txDateBounds = dateInputBoundsForMonth(year, month);

  const monthLabel = new Date(Date.UTC(year, month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Ledger</h1>
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
          <a
            className="rounded-lg px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-100"
            href="/api/auth/signout"
          >
            Sign out
          </a>
        </div>
      </header>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">Month opening balance</h2>
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
            No saved opening for this month yet—the field defaults to last month&apos;s closing
            balance. Adjust if needed, then save to store it for this month.
          </p>
        ) : null}
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-medium text-zinc-700">Add transaction</h2>
        <form
          action={createTransaction}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          key={`add-tx-${year}-${month}`}
        >
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-zinc-700">Payee</span>
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400"
              name="payee"
              type="text"
              placeholder="Rent, Paycheck, …"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Amount (+ / −)</span>
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400"
              name="amount"
              type="text"
              placeholder="-1830.00"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-zinc-700">Date</span>
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 font-mono text-sm text-zinc-900 [color-scheme:light]"
              defaultValue={txDateDefault}
              max={txDateBounds.max}
              min={txDateBounds.min}
              name="occurredOn"
              type="date"
            />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-4">
            <button
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              type="submit"
            >
              Add
            </button>
          </div>
        </form>
      </section>

      <section>
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Payee</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 text-right font-medium">Balance after</th>
                <th className="w-24 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {state.transactions.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-zinc-500" colSpan={5}>
                    No transactions this month yet.
                  </td>
                </tr>
              ) : (
                state.transactions.map((row) => {
                  const amt = Number(row.amount);
                  const d = row.occurredOn.toISOString().slice(0, 10);
                  return (
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/80" key={row.id}>
                      <td className="px-4 py-2 font-mono text-zinc-700">{d}</td>
                      <td className="px-4 py-2 text-zinc-900">{row.payee}</td>
                      <td
                        className={`px-4 py-2 text-right font-mono tabular-nums ${
                          amt > 0 ? "text-emerald-700" : amt < 0 ? "text-red-600" : "text-zinc-800"
                        }`}
                      >
                        {money.format(amt)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-zinc-800">
                        {money.format(Number(row.balanceAfter))}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <form action={deleteTransaction}>
                          <input name="id" type="hidden" value={row.id} />
                          <button
                            className="text-xs text-red-600 hover:underline"
                            type="submit"
                          >
                            Delete
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-zinc-700">
          Closing balance for {monthLabel}:{" "}
          <span className="font-mono text-base font-semibold text-zinc-950 tabular-nums">
            {money.format(Number(state.closing))}
          </span>
        </p>
      </section>
    </div>
  );
}

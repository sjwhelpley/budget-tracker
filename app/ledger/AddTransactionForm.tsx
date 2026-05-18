"use client";

import { useActionState, useEffect } from "react";
import { createTransaction } from "@/app/actions/ledger";
import { useToast } from "@/app/components/Toaster";
import { PayeeAutocompleteInput } from "@/app/ledger/PayeeAutocompleteInput";

type Props = {
  year: number;
  month: number;
  txDateDefault: string;
  txDateBounds: { min: string; max: string };
  payeeSuggestions: string[];
};

export function AddTransactionForm({
  year,
  month,
  txDateDefault,
  txDateBounds,
  payeeSuggestions,
}: Props) {
  const showToast = useToast();
  const [state, formAction] = useActionState(createTransaction, null);

  useEffect(() => {
    if (state?.error) {
      showToast(state.error);
    }
  }, [state, showToast]);

  return (
    <form
      action={formAction}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      key={`add-tx-${year}-${month}`}
    >
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className="text-zinc-700">Payee</span>
        <PayeeAutocompleteInput
          name="payee"
          placeholder="Rent, Paycheck, …"
          required
          suggestions={payeeSuggestions}
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
  );
}

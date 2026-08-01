export const TRANSACTION_CATEGORIES = [
  "INCOME",
  "EXPENSES",
  "LOANS",
  "CREDIT_CARDS",
  "OTHER",
  "TRANSFER",
] as const;
export type TransactionCategoryValue = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategoryValue, string> = {
  INCOME: "Income",
  EXPENSES: "Expenses",
  LOANS: "Loans",
  CREDIT_CARDS: "Credit Cards",
  OTHER: "Other",
  TRANSFER: "Transfer",
};

/**
 * Transfers move money between your own accounts, and Other is too much of a
 * catch-all to be meaningful, so both are excluded from category totals.
 */
export const TRANSACTION_CATEGORIES_IN_TOTALS = TRANSACTION_CATEGORIES.filter(
  (category) => category !== "TRANSFER" && category !== "OTHER",
);

/** Outflow categories summed into the "total spending" line under category totals. */
export const NEGATIVE_TOTAL_CATEGORIES: readonly TransactionCategoryValue[] = [
  "EXPENSES",
  "LOANS",
  "CREDIT_CARDS",
];

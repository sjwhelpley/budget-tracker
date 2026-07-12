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

/** Transfers move money between your own accounts, so they're excluded from category totals. */
export const TRANSACTION_CATEGORIES_IN_TOTALS = TRANSACTION_CATEGORIES.filter(
  (category) => category !== "TRANSFER",
);

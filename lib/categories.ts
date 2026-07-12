export const TRANSACTION_CATEGORIES = [
  "EXPENSES",
  "LOANS",
  "CREDIT_CARDS",
  "OTHER",
] as const;
export type TransactionCategoryValue = (typeof TRANSACTION_CATEGORIES)[number];

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategoryValue, string> = {
  EXPENSES: "Expenses",
  LOANS: "Loans",
  CREDIT_CARDS: "Credit Cards",
  OTHER: "Other",
};

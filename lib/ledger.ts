import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export function monthStartUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

export function monthEndExclusiveUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

/** Previous / next calendar month in UTC. */
export function shiftMonth(year: number, month: number, delta: number) {
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Last calendar day of month (1–12), UTC. */
export function lastDayOfMonthUtc(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 0));
}

/**
 * Default `value` for `<input type="date">`: today (UTC) if it falls in this month, else the 1st.
 * Matches server action logic when the field is left empty.
 */
export function defaultDateInputValueForMonth(year: number, month: number): string {
  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = monthStartUtc(year, month);
  const monthEnd = monthEndExclusiveUtc(year, month);
  const pick = todayUtc >= monthStart && todayUtc < monthEnd ? todayUtc : monthStart;
  return pick.toISOString().slice(0, 10);
}

/** `min` / `max` for `<input type="date">` so the picker stays within the ledger month. */
export function dateInputBoundsForMonth(year: number, month: number): { min: string; max: string } {
  const min = monthStartUtc(year, month).toISOString().slice(0, 10);
  const max = lastDayOfMonthUtc(year, month).toISOString().slice(0, 10);
  return { min, max };
}

async function sumTxForMonth(
  userId: string,
  year: number,
  month: number,
): Promise<Prisma.Decimal> {
  const start = monthStartUtc(year, month);
  const end = monthEndExclusiveUtc(year, month);
  const agg = await prisma.transaction.aggregate({
    where: { userId, occurredOn: { gte: start, lt: end } },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? new Prisma.Decimal(0);
}

/**
 * Closing balance at end of a calendar month (after all transactions).
 * Chains backward when earlier months have no stored opening: opening(M) defaults to closing(M-1).
 */
async function getClosingBalanceForMonth(
  userId: string,
  year: number,
  month: number,
  depth: number,
  cache: Map<string, Prisma.Decimal>,
): Promise<Prisma.Decimal> {
  const key = `${year}-${month}`;
  if (cache.has(key)) {
    return cache.get(key)!;
  }
  if (depth > 240) {
    const zero = new Prisma.Decimal(0);
    cache.set(key, zero);
    return zero;
  }

  const opening = await getEffectiveOpeningBalance(userId, year, month, depth, cache);
  const sumTx = await sumTxForMonth(userId, year, month);
  const closing = opening.add(sumTx);
  cache.set(key, closing);
  return closing;
}

async function getEffectiveOpeningBalance(
  userId: string,
  year: number,
  month: number,
  depth: number,
  cache: Map<string, Prisma.Decimal>,
): Promise<Prisma.Decimal> {
  const start = monthStartUtc(year, month);
  const row = await prisma.monthOpening.findUnique({
    where: { userId_month: { userId, month: start } },
  });
  if (row) {
    return row.openingBalance;
  }
  if (depth > 240) {
    return new Prisma.Decimal(0);
  }
  const prev = shiftMonth(year, month, -1);
  return getClosingBalanceForMonth(userId, prev.year, prev.month, depth + 1, cache);
}

export type LedgerRow = {
  id: string;
  occurredOn: Date;
  payee: string;
  amount: string;
  sortOrder: number;
  balanceAfter: string;
};

export async function getLedgerState(
  userId: string,
  year: number,
  month: number,
): Promise<{
  storedOpening: string | null;
  effectiveOpening: string;
  hasStoredOpening: boolean;
  closing: string;
  transactions: LedgerRow[];
}> {
  const start = monthStartUtc(year, month);
  const end = monthEndExclusiveUtc(year, month);

  const openingRow = await prisma.monthOpening.findUnique({
    where: { userId_month: { userId, month: start } },
  });

  const cache = new Map<string, Prisma.Decimal>();
  const effectiveOpeningDec = await getEffectiveOpeningBalance(userId, year, month, 0, cache);

  const txs = await prisma.transaction.findMany({
    where: {
      userId,
      occurredOn: { gte: start, lt: end },
    },
    orderBy: [
      { occurredOn: "asc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });

  let running = effectiveOpeningDec;
  const transactions: LedgerRow[] = txs.map((t) => {
    running = running.add(t.amount);
    return {
      id: t.id,
      occurredOn: t.occurredOn,
      payee: t.payee,
      amount: t.amount.toFixed(2),
      sortOrder: t.sortOrder,
      balanceAfter: running.toFixed(2),
    };
  });

  return {
    storedOpening: openingRow?.openingBalance.toFixed(2) ?? null,
    effectiveOpening: effectiveOpeningDec.toFixed(2),
    hasStoredOpening: openingRow !== null,
    closing: running.toFixed(2),
    transactions,
  };
}

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import {
  TRANSACTION_CATEGORIES,
  type TransactionCategoryValue,
} from "@/lib/categories";
import { monthEndExclusiveUtc, monthStartUtc } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

type ActionResult = { error: string } | { success: true } | null;

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new Error("Unauthorized");
  }
  return id;
}

function catchError(e: unknown): { error: string } {
  if (e instanceof Error) return { error: e.message };
  return { error: "An unexpected error occurred" };
}

function parseCategory(raw: FormDataEntryValue | null): TransactionCategoryValue {
  const value = String(raw ?? "").trim().toUpperCase();
  if ((TRANSACTION_CATEGORIES as readonly string[]).includes(value)) {
    return value as TransactionCategoryValue;
  }
  throw new Error("Invalid category");
}

export async function setMonthOpening(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const raw = String(formData.get("openingBalance") ?? "").trim();
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }
  const openingBalance = new Prisma.Decimal(raw || "0");

  const start = monthStartUtc(year, month);
  await prisma.monthOpening.upsert({
    where: { userId_month: { userId, month: start } },
    create: { userId, month: start, openingBalance },
    update: { openingBalance },
  });

  revalidatePath("/ledger");
}

export async function setMonthBalances(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
  }
  const savingsRaw = String(formData.get("savingsBalance") ?? "").trim();
  const rothRaw = String(formData.get("rothIraBalance") ?? "").trim();
  const savingsBalance = new Prisma.Decimal(savingsRaw || "0");
  const rothIraBalance = new Prisma.Decimal(rothRaw || "0");

  const start = monthStartUtc(year, month);
  await prisma.monthBalances.upsert({
    where: { userId_month: { userId, month: start } },
    create: { userId, month: start, savingsBalance, rothIraBalance },
    update: { savingsBalance, rothIraBalance },
  });

  revalidatePath("/ledger");
}

export async function createTransaction(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const payee = String(formData.get("payee") ?? "").trim();
    const amountRaw = String(formData.get("amount") ?? "").trim();
    const dateRaw = String(formData.get("occurredOn") ?? "").trim();
    const category = parseCategory(formData.get("category"));

    if (!payee) return { error: "Payee is required" };
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return { error: "Invalid month" };
    }

    const amount = new Prisma.Decimal(amountRaw || "0");
    const monthStart = monthStartUtc(year, month);
    const monthEnd = monthEndExclusiveUtc(year, month);

    let occurredOn: Date;
    if (dateRaw) {
      const [y, m, d] = dateRaw.split("-").map(Number);
      occurredOn = new Date(Date.UTC(y, m - 1, d));
    } else {
      const now = new Date();
      const todayUtc = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      );
      occurredOn = todayUtc >= monthStart && todayUtc < monthEnd ? todayUtc : monthStart;
    }

    if (occurredOn < monthStart || occurredOn >= monthEnd) {
      return { error: "Date must be within the selected month" };
    }

    const last = await prisma.transaction.findFirst({
      where: { userId, occurredOn },
      orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
      select: { sortOrder: true },
    });
    const sortOrder = (last?.sortOrder ?? -1) + 1;

    await prisma.transaction.create({
      data: { userId, occurredOn, payee, amount, category, sortOrder },
    });

    revalidatePath("/ledger");
    return { success: true };
  } catch (e) {
    return catchError(e);
  }
}

export async function updateTransaction(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const id = String(formData.get("id") ?? "");
    const year = Number(formData.get("year"));
    const month = Number(formData.get("month"));
    const payee = String(formData.get("payee") ?? "").trim();
    const amountRaw = String(formData.get("amount") ?? "").trim();
    const dateRaw = String(formData.get("occurredOn") ?? "").trim();
    const category = parseCategory(formData.get("category"));

    if (!id) return { error: "Missing id" };
    if (!payee) return { error: "Payee is required" };
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return { error: "Invalid month" };
    }

    const amount = new Prisma.Decimal(amountRaw || "0");
    const monthStart = monthStartUtc(year, month);
    const monthEnd = monthEndExclusiveUtc(year, month);

    if (!dateRaw) return { error: "Date is required" };
    const [y, m, d] = dateRaw.split("-").map(Number);
    const occurredOn = new Date(Date.UTC(y, m - 1, d));

    if (occurredOn < monthStart || occurredOn >= monthEnd) {
      return { error: "Date must be within the selected month" };
    }

    const row = await prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!row) return { error: "Transaction not found" };

    await prisma.transaction.update({
      where: { id },
      data: { payee, amount, occurredOn, category },
    });

    revalidatePath("/ledger");
    return null;
  } catch (e) {
    return catchError(e);
  }
}

export async function setTransactionStatus(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const id = String(formData.get("id") ?? "");
    const statusRaw = String(formData.get("status") ?? "").trim().toUpperCase();

    if (!id) return { error: "Missing id" };
    if (statusRaw !== "NONE" && statusRaw !== "COMPLETED" && statusRaw !== "ESTIMATED") {
      return { error: "Invalid status" };
    }

    const row = await prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!row) return { error: "Transaction not found" };

    await prisma.transaction.update({
      where: { id },
      data: { status: statusRaw as "NONE" | "COMPLETED" | "ESTIMATED" },
    });

    revalidatePath("/ledger");
    return null;
  } catch (e) {
    return catchError(e);
  }
}

export async function deleteTransaction(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing id" };

    const row = await prisma.transaction.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!row) return { error: "Transaction not found" };

    await prisma.transaction.delete({ where: { id } });
    revalidatePath("/ledger");
    return null;
  } catch (e) {
    return catchError(e);
  }
}

export async function bulkSetCategory(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const ids = formData.getAll("id").map(String).filter(Boolean);
    const category = parseCategory(formData.get("category"));

    if (ids.length === 0) return { error: "No transactions selected" };

    const result = await prisma.transaction.updateMany({
      where: { id: { in: ids }, userId },
      data: { category },
    });
    if (result.count === 0) return { error: "Transactions not found" };

    revalidatePath("/ledger");
    return { success: true };
  } catch (e) {
    return catchError(e);
  }
}

async function copyOneTransactionToNextMonth(userId: string, id: string): Promise<boolean> {
  const tx = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { payee: true, amount: true, occurredOn: true, category: true, status: true },
  });
  if (!tx) return false;

  const d = tx.occurredOn;
  const srcMonth = d.getUTCMonth(); // 0-indexed
  const srcYear = d.getUTCFullYear();
  const nextMonth = srcMonth === 11 ? 0 : srcMonth + 1;
  const nextYear = srcMonth === 11 ? srcYear + 1 : srcYear;

  // Clamp day to last day of next month (e.g. Jan 31 → Feb 28)
  const lastDayOfNextMonth = new Date(Date.UTC(nextYear, nextMonth + 1, 0)).getUTCDate();
  const day = Math.min(d.getUTCDate(), lastDayOfNextMonth);
  const occurredOn = new Date(Date.UTC(nextYear, nextMonth, day));

  const last = await prisma.transaction.findFirst({
    where: { userId, occurredOn },
    orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
    select: { sortOrder: true },
  });
  const sortOrder = (last?.sortOrder ?? -1) + 1;

  await prisma.transaction.create({
    data: {
      userId,
      occurredOn,
      payee: tx.payee,
      amount: tx.amount,
      category: tx.category,
      status: tx.status,
      sortOrder,
    },
  });
  return true;
}

export async function copyTransactionToNextMonth(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const id = String(formData.get("id") ?? "");
    if (!id) return { error: "Missing id" };

    const copied = await copyOneTransactionToNextMonth(userId, id);
    if (!copied) return { error: "Transaction not found" };

    revalidatePath("/ledger");
    return { success: true };
  } catch (e) {
    return catchError(e);
  }
}

export async function bulkCopyToNextMonth(formData: FormData): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const ids = formData.getAll("id").map(String).filter(Boolean);
    if (ids.length === 0) return { error: "No transactions selected" };

    // Sequential, not parallel: each copy looks up the current max sortOrder
    // for its target date, so concurrent copies to the same date could collide.
    let copiedCount = 0;
    for (const id of ids) {
      const copied = await copyOneTransactionToNextMonth(userId, id);
      if (copied) copiedCount++;
    }
    if (copiedCount === 0) return { error: "Transactions not found" };

    revalidatePath("/ledger");
    return { success: true };
  } catch (e) {
    return catchError(e);
  }
}

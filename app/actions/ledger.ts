"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/app/generated/prisma/client";
import { auth } from "@/auth";
import { monthEndExclusiveUtc, monthStartUtc } from "@/lib/ledger";
import { prisma } from "@/lib/prisma";

async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    throw new Error("Unauthorized");
  }
  return id;
}

export async function setMonthOpening(formData: FormData) {
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

export async function createTransaction(formData: FormData) {
  const userId = await requireUserId();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const payee = String(formData.get("payee") ?? "").trim();
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const dateRaw = String(formData.get("occurredOn") ?? "").trim();

  if (!payee) {
    throw new Error("Payee is required");
  }
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    throw new Error("Invalid month");
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
    if (todayUtc >= monthStart && todayUtc < monthEnd) {
      occurredOn = todayUtc;
    } else {
      occurredOn = monthStart;
    }
  }

  if (occurredOn < monthStart || occurredOn >= monthEnd) {
    throw new Error("Date must be within the selected month");
  }

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
      payee,
      amount,
      sortOrder,
    },
  });

  revalidatePath("/ledger");
}

export async function deleteTransaction(formData: FormData) {
  const userId = await requireUserId();
  const id = String(formData.get("id") ?? "");
  if (!id) {
    throw new Error("Missing id");
  }

  const row = await prisma.transaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!row) {
    throw new Error("Not found");
  }

  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/ledger");
}

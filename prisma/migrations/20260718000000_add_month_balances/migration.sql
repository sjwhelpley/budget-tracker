-- CreateTable
CREATE TABLE "MonthBalances" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "savingsBalance" DECIMAL(19,2),
    "rothIraBalance" DECIMAL(19,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthBalances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthBalances_userId_month_idx" ON "MonthBalances"("userId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "MonthBalances_userId_month_key" ON "MonthBalances"("userId", "month");

-- AddForeignKey
ALTER TABLE "MonthBalances" ADD CONSTRAINT "MonthBalances_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

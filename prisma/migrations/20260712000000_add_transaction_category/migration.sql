-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('EXPENSES', 'LOANS', 'CREDIT_CARDS', 'OTHER');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "category" "TransactionCategory" NOT NULL DEFAULT 'EXPENSES';

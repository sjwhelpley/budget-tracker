-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('NONE', 'COMPLETED', 'ESTIMATED');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "status" "TransactionStatus" NOT NULL DEFAULT 'NONE';

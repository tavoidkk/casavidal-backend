/*
  Warnings:

  - A unique constraint covering the columns `[document]` on the table `clients` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "document" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "clients_document_key" ON "clients"("document");

-- AlterTable
ALTER TABLE "special_orders" ADD COLUMN     "paymentMethod" "PaymentMethod",
ADD COLUMN     "purchasePrice" DECIMAL(12,2),
ADD COLUMN     "saleId" TEXT,
ADD COLUMN     "salePrice" DECIMAL(12,2),
ADD COLUMN     "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "supplierId" TEXT,
ADD COLUMN     "supplierPaymentMethod" TEXT;

-- AlterTable
ALTER TABLE "purchase_orders" ADD COLUMN     "paymentTerms" TEXT,
ADD COLUMN     "shippingCost" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Seed new columns using existing data
UPDATE "special_orders" so
SET
  "supplierId" = po."supplierId",
  "purchasePrice" = COALESCE(poi."unitPrice", so."purchasePrice"),
  "salePrice" = COALESCE(so."salePrice", poi."unitPrice", so."purchasePrice"),
  "shippingCost" = COALESCE(po."shippingCost", so."shippingCost"),
  "paymentMethod" = COALESCE(so."paymentMethod", 'TRANSFERENCIA')
FROM "purchase_orders" po
LEFT JOIN "purchase_order_items" poi ON poi."purchaseOrderId" = po."id"
WHERE so."purchaseOrderId" = po."id";

-- Ensure at least one supplier exists
INSERT INTO "suppliers" ("id", "name", "phone", "createdAt", "updatedAt")
SELECT '00000000-0000-0000-0000-000000000000', 'Proveedor General', '0000000000', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "suppliers");

-- Fallback supplier for registros sin relación
UPDATE "special_orders" so
SET "supplierId" = (SELECT "id" FROM "suppliers" ORDER BY "createdAt" LIMIT 1)
WHERE "supplierId" IS NULL;

-- Fallback prices
UPDATE "special_orders" SET "purchasePrice" = 0 WHERE "purchasePrice" IS NULL;
UPDATE "special_orders" SET "salePrice" = COALESCE("salePrice", "purchasePrice") WHERE "salePrice" IS NULL;

-- Enforce NOT NULL on campos obligatorios
ALTER TABLE "special_orders"
ALTER COLUMN "purchasePrice" SET NOT NULL,
ALTER COLUMN "salePrice" SET NOT NULL,
ALTER COLUMN "supplierId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "special_orders" ADD CONSTRAINT "special_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_orders" ADD CONSTRAINT "special_orders_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

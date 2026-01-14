-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'VENDEDOR', 'VISUALIZADOR');

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('NATURAL', 'JURIDICO');

-- CreateEnum
CREATE TYPE "ClientCategory" AS ENUM ('NUEVO', 'REGULAR', 'VIP', 'MAYORISTA', 'INACTIVO');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'PUNTO_VENTA', 'PAGO_MOVIL', 'ZELLE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDIENTE', 'ORDEN_GENERADA', 'EN_TRANSITO', 'RECIBIDO', 'LISTO_CLIENTE', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('BORRADOR', 'ENVIADA', 'CONFIRMADA', 'RECIBIDA_PARCIAL', 'RECIBIDA_COMPLETA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('EMAIL', 'WHATSAPP', 'PROMOCION', 'DESCUENTO');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('BORRADOR', 'PROGRAMADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LLAMADA', 'EMAIL', 'REUNION', 'NOTA', 'TAREA', 'SEGUIMIENTO');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PENDIENTE', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PEDIDO_LISTO', 'STOCK_BAJO', 'NUEVO_CLIENTE', 'VENTA_COMPLETADA', 'SISTEMA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VENDEDOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "clientType" "ClientType" NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "rif" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "category" "ClientCategory" NOT NULL DEFAULT 'NUEVO',
    "loyaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "totalPurchases" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastPurchaseAt" TIMESTAMP(3),

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_scoring" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "purchaseFrequency" INTEGER NOT NULL DEFAULT 0,
    "averageTicket" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "daysSinceLastPurchase" INTEGER NOT NULL DEFAULT 0,
    "lifetimeValue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "churnProbability" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "nextPurchaseDays" INTEGER,
    "recommendedProducts" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_scoring_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "categoryId" TEXT NOT NULL,
    "costPrice" DECIMAL(12,2) NOT NULL,
    "salePrice" DECIMAL(12,2) NOT NULL,
    "wholesalePrice" DECIMAL(12,2),
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "maxStock" INTEGER,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "parentProductId" TEXT,
    "variantInfo" TEXT,
    "image" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'unidad',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rif" TEXT,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "rating" DECIMAL(3,2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_suppliers" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierPrice" DECIMAL(12,2) NOT NULL,
    "leadTimeDays" INTEGER,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" TEXT NOT NULL,
    "saleNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "special_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDIENTE',
    "estimatedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "notifiedAt" TIMESTAMP(3),
    "purchaseOrderId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "special_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'BORRADOR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "quantityReceived" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stockBefore" INTEGER NOT NULL,
    "stockAfter" INTEGER NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "CampaignType" NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'BORRADOR',
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "targetClients" TEXT[],
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "status" "ActivityStatus" NOT NULL DEFAULT 'PENDIENTE',
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "userId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clients_rif_key" ON "clients"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "client_scoring_clientId_key" ON "client_scoring"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_rif_key" ON "suppliers"("rif");

-- CreateIndex
CREATE UNIQUE INDEX "product_suppliers_productId_supplierId_key" ON "product_suppliers"("productId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "sales_saleNumber_key" ON "sales"("saleNumber");

-- CreateIndex
CREATE UNIQUE INDEX "special_orders_orderNumber_key" ON "special_orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_orderNumber_key" ON "purchase_orders"("orderNumber");

-- AddForeignKey
ALTER TABLE "client_scoring" ADD CONSTRAINT "client_scoring_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_orders" ADD CONSTRAINT "special_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_orders" ADD CONSTRAINT "special_orders_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "special_orders" ADD CONSTRAINT "special_orders_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

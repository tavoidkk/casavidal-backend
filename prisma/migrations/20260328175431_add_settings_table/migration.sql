-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Casa Vidal',
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "companyLogo" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'CLP',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 19.00,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 10,
    "defaultPaymentTerm" INTEGER NOT NULL DEFAULT 30,
    "enableNotifications" BOOLEAN NOT NULL DEFAULT true,
    "enableAutoBackup" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'es-CL',
    "timezone" TEXT NOT NULL DEFAULT 'America/Santiago',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

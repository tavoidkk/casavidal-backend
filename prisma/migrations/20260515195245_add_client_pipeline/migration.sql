-- CreateEnum
CREATE TYPE "ClientStage" AS ENUM ('NUEVO', 'CONTACTADO', 'COTIZACION', 'GANADO', 'PERDIDO');

-- CreateEnum
CREATE TYPE "ClientSource" AS ENUM ('REFERIDO', 'REDES', 'WHATSAPP', 'VISITA', 'OTRO');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "lastContactAt" TIMESTAMP(3),
ADD COLUMN     "source" "ClientSource",
ADD COLUMN     "stage" "ClientStage" NOT NULL DEFAULT 'NUEVO';

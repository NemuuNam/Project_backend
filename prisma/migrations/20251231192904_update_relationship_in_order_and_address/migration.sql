-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "address_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "Addresses"("address_id") ON DELETE SET NULL ON UPDATE CASCADE;

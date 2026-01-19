/*
  Warnings:

  - The primary key for the `Categories` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `category_id` on the `Categories` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `change_qty` on the `Inventory_Logs` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `quantity` on the `Order_Items` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `price_at_order` on the `Order_Items` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `total_amount` on the `Orders` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The primary key for the `Payment_Methods` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `method_id` on the `Payment_Methods` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `amount_paid` on the `Payments` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The primary key for the `Permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `permission_id` on the `Permissions` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `rating_score` on the `Product_Reviews` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `unit_price` on the `Products` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `stock_quantity` on the `Products` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `category_id` on the `Products` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The primary key for the `Role_Permissions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `role_permissions_id` on the `Role_Permissions` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `role_id` on the `Role_Permissions` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `permission_id` on the `Role_Permissions` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The primary key for the `Roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `role_id` on the `Roles` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `role_level` on the `Roles` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - The primary key for the `Shipping_Providers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `provider_id` on the `Shipping_Providers` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `provider_id` on the `Shippings` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - You are about to alter the column `role_id` on the `Users` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `SmallInt`.
  - A unique constraint covering the columns `[permission_name]` on the table `Permissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `user_id` to the `Product_Reviews` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Products" DROP CONSTRAINT "Products_category_id_fkey";

-- DropForeignKey
ALTER TABLE "Role_Permissions" DROP CONSTRAINT "Role_Permissions_permission_id_fkey";

-- DropForeignKey
ALTER TABLE "Role_Permissions" DROP CONSTRAINT "Role_Permissions_role_id_fkey";

-- DropForeignKey
ALTER TABLE "Shippings" DROP CONSTRAINT "Shippings_provider_id_fkey";

-- DropForeignKey
ALTER TABLE "Users" DROP CONSTRAINT "Users_role_id_fkey";

-- AlterTable
ALTER TABLE "Categories" DROP CONSTRAINT "Categories_pkey",
ALTER COLUMN "category_id" SET DATA TYPE smallint,
ADD CONSTRAINT "Categories_pkey" PRIMARY KEY ("category_id");

-- AlterTable
ALTER TABLE "Inventory_Logs" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "change_qty" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "Order_Items" ALTER COLUMN "quantity" SET DATA TYPE SMALLINT,
ALTER COLUMN "price_at_order" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "Orders" ADD COLUMN     "rejection_reason" VARCHAR(255),
ADD COLUMN     "shipping_cost" SMALLINT NOT NULL DEFAULT 0,
ALTER COLUMN "total_amount" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "Payment_Methods" DROP CONSTRAINT "Payment_Methods_pkey",
ALTER COLUMN "method_id" SET DATA TYPE smallint,
ADD CONSTRAINT "Payment_Methods_pkey" PRIMARY KEY ("method_id");

-- AlterTable
ALTER TABLE "Payments" ADD COLUMN     "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "amount_paid" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "Permissions" DROP CONSTRAINT "Permissions_pkey",
ADD COLUMN     "description" VARCHAR(255),
ALTER COLUMN "permission_id" SET DATA TYPE smallint,
ADD CONSTRAINT "Permissions_pkey" PRIMARY KEY ("permission_id");

-- AlterTable
ALTER TABLE "Product_Reviews" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "user_id" VARCHAR(36) NOT NULL,
ALTER COLUMN "rating_score" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "description" VARCHAR(255),
ALTER COLUMN "unit_price" SET DATA TYPE SMALLINT,
ALTER COLUMN "stock_quantity" SET DATA TYPE SMALLINT,
ALTER COLUMN "category_id" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "Role_Permissions" DROP CONSTRAINT "Role_Permissions_pkey",
ALTER COLUMN "role_permissions_id" SET DATA TYPE smallint,
ALTER COLUMN "role_id" SET DATA TYPE SMALLINT,
ALTER COLUMN "permission_id" SET DATA TYPE SMALLINT,
ADD CONSTRAINT "Role_Permissions_pkey" PRIMARY KEY ("role_permissions_id");

-- AlterTable
ALTER TABLE "Roles" DROP CONSTRAINT "Roles_pkey",
ALTER COLUMN "role_id" SET DATA TYPE smallint,
ALTER COLUMN "role_level" SET DATA TYPE SMALLINT,
ADD CONSTRAINT "Roles_pkey" PRIMARY KEY ("role_id");

-- AlterTable
ALTER TABLE "Shipping_Providers" DROP CONSTRAINT "Shipping_Providers_pkey",
ALTER COLUMN "provider_id" SET DATA TYPE smallint,
ADD CONSTRAINT "Shipping_Providers_pkey" PRIMARY KEY ("provider_id");

-- AlterTable
ALTER TABLE "Shippings" ALTER COLUMN "provider_id" SET DATA TYPE SMALLINT;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "phone" VARCHAR(10),
ALTER COLUMN "role_id" SET DATA TYPE SMALLINT;

-- CreateIndex
CREATE UNIQUE INDEX "Permissions_permission_name_key" ON "Permissions"("permission_name");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role_Permissions" ADD CONSTRAINT "Role_Permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permissions"("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role_Permissions" ADD CONSTRAINT "Role_Permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shippings" ADD CONSTRAINT "Shippings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "Shipping_Providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product_Reviews" ADD CONSTRAINT "Product_Reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

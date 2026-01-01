/*
  Warnings:

  - A unique constraint covering the columns `[config_key]` on the table `Shop_Settings` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Shop_Settings_config_key_key" ON "Shop_Settings"("config_key");

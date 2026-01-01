-- CreateTable
CREATE TABLE "Roles" (
    "role_id" SERIAL NOT NULL,
    "role_name" VARCHAR(20) NOT NULL,
    "role_level" INTEGER NOT NULL,

    CONSTRAINT "Roles_pkey" PRIMARY KEY ("role_id")
);

-- CreateTable
CREATE TABLE "Users" (
    "user_id" VARCHAR(36) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "password" VARCHAR(60) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "role_id" INTEGER NOT NULL,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Permissions" (
    "permission_id" SERIAL NOT NULL,
    "permission_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Permissions_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "Role_Permissions" (
    "role_permissions_id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "Role_Permissions_pkey" PRIMARY KEY ("role_permissions_id")
);

-- CreateTable
CREATE TABLE "System_Logs" (
    "log_id" SERIAL NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "action_details" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "System_Logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "Categories" (
    "category_id" SERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "Products" (
    "product_id" VARCHAR(36) NOT NULL,
    "product_name" VARCHAR(100) NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "stock_quantity" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "Product_Images" (
    "image_id" SERIAL NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "image_url" TEXT NOT NULL,
    "is_main" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Product_Images_pkey" PRIMARY KEY ("image_id")
);

-- CreateTable
CREATE TABLE "Inventory_Logs" (
    "inv_log_id" SERIAL NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "change_qty" INTEGER NOT NULL,
    "reason" VARCHAR(255) NOT NULL,

    CONSTRAINT "Inventory_Logs_pkey" PRIMARY KEY ("inv_log_id")
);

-- CreateTable
CREATE TABLE "Product_Views" (
    "view_id" SERIAL NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_Views_pkey" PRIMARY KEY ("view_id")
);

-- CreateTable
CREATE TABLE "Addresses" (
    "address_id" SERIAL NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "recipient_name" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(10) NOT NULL,
    "address_detail" VARCHAR(255) NOT NULL,

    CONSTRAINT "Addresses_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "Orders" (
    "order_id" VARCHAR(16) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "tracking_number" VARCHAR(20),

    CONSTRAINT "Orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "Order_Items" (
    "item_id" SERIAL NOT NULL,
    "order_id" VARCHAR(16) NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_at_order" INTEGER NOT NULL,

    CONSTRAINT "Order_Items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "Shippings" (
    "shipping_id" SERIAL NOT NULL,
    "order_id" VARCHAR(16) NOT NULL,
    "shipping_date" TIMESTAMP(3) NOT NULL,
    "provider_id" INTEGER NOT NULL,

    CONSTRAINT "Shippings_pkey" PRIMARY KEY ("shipping_id")
);

-- CreateTable
CREATE TABLE "Shipping_Providers" (
    "provider_id" SERIAL NOT NULL,
    "provider_name" VARCHAR(100) NOT NULL,

    CONSTRAINT "Shipping_Providers_pkey" PRIMARY KEY ("provider_id")
);

-- CreateTable
CREATE TABLE "Payment_Methods" (
    "method_id" SERIAL NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "account_number" VARCHAR(15) NOT NULL,

    CONSTRAINT "Payment_Methods_pkey" PRIMARY KEY ("method_id")
);

-- CreateTable
CREATE TABLE "Payments" (
    "payment_id" VARCHAR(36) NOT NULL,
    "order_id" VARCHAR(16) NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "slip_url" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "Product_Reviews" (
    "review_id" SERIAL NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,
    "rating_score" INTEGER NOT NULL,
    "comment" VARCHAR(255),

    CONSTRAINT "Product_Reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "Wishlists" (
    "wishlist_id" SERIAL NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "product_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "Wishlists_pkey" PRIMARY KEY ("wishlist_id")
);

-- CreateTable
CREATE TABLE "Shop_Settings" (
    "setting_id" SERIAL NOT NULL,
    "config_key" VARCHAR(100) NOT NULL,
    "config_value" TEXT NOT NULL,

    CONSTRAINT "Shop_Settings_pkey" PRIMARY KEY ("setting_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Roles_role_name_key" ON "Roles"("role_name");

-- CreateIndex
CREATE UNIQUE INDEX "Roles_role_level_key" ON "Roles"("role_level");

-- CreateIndex
CREATE UNIQUE INDEX "Users_email_key" ON "Users"("email");

-- AddForeignKey
ALTER TABLE "Users" ADD CONSTRAINT "Users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role_Permissions" ADD CONSTRAINT "Role_Permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "Roles"("role_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role_Permissions" ADD CONSTRAINT "Role_Permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permissions"("permission_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "System_Logs" ADD CONSTRAINT "System_Logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "Categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product_Images" ADD CONSTRAINT "Product_Images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory_Logs" ADD CONSTRAINT "Inventory_Logs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory_Logs" ADD CONSTRAINT "Inventory_Logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product_Views" ADD CONSTRAINT "Product_Views_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Addresses" ADD CONSTRAINT "Addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Orders" ADD CONSTRAINT "Orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_Items" ADD CONSTRAINT "Order_Items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order_Items" ADD CONSTRAINT "Order_Items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shippings" ADD CONSTRAINT "Shippings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shippings" ADD CONSTRAINT "Shippings_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "Shipping_Providers"("provider_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product_Reviews" ADD CONSTRAINT "Product_Reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlists" ADD CONSTRAINT "Wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wishlists" ADD CONSTRAINT "Wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("product_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "BusinessOwner" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "pin" TEXT,
    "is_pin_enabled" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT NOT NULL,
    "phone" TEXT,
    "accountNo" TEXT,
    "dateOfBirth" TEXT,
    "nationality" TEXT,
    "occupation" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "avatar" TEXT,
    "verify_otp" BOOLEAN NOT NULL DEFAULT false,
    "otp_trial" TEXT NOT NULL,
    "otp_secret" TEXT NOT NULL,
    "otp" TEXT,
    "KYC" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BusinessOwner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL,
    "businessName" TEXT,
    "businessReg" TEXT,
    "address" TEXT,
    "country" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "accountNo" TEXT,
    "recipientBankId" TEXT,
    "bankCode" TEXT,
    "owner_id" TEXT NOT NULL,

    CONSTRAINT "BusinessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "holder_id" TEXT NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "address" TEXT,
    "state" TEXT,
    "businessOwner_id" TEXT,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "type" TEXT,
    "date" TEXT,
    "status" TEXT,
    "ref" TEXT,
    "client_id" TEXT NOT NULL,
    "businessOwner_id" TEXT NOT NULL,
    "invoice_id" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "amountPaid" DOUBLE PRECISION,
    "date" TEXT,
    "status" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "subTotal" TEXT,
    "discount" TEXT,
    "tax" TEXT,
    "client_id" TEXT,
    "businessOwner_id" TEXT,
    "items" JSONB,
    "paymentLink" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessOwner_email_key" ON "BusinessOwner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessOwner_otp_trial_key" ON "BusinessOwner"("otp_trial");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessOwner_otp_key" ON "BusinessOwner"("otp");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessProfile_owner_id_key" ON "BusinessProfile"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_holder_id_key" ON "Wallet"("holder_id");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_ref_key" ON "Transaction"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_invoice_id_key" ON "Transaction"("invoice_id");

-- AddForeignKey
ALTER TABLE "BusinessProfile" ADD CONSTRAINT "BusinessProfile_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "BusinessOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_holder_id_fkey" FOREIGN KEY ("holder_id") REFERENCES "BusinessOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_businessOwner_id_fkey" FOREIGN KEY ("businessOwner_id") REFERENCES "BusinessOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_businessOwner_id_fkey" FOREIGN KEY ("businessOwner_id") REFERENCES "BusinessOwner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_businessOwner_id_fkey" FOREIGN KEY ("businessOwner_id") REFERENCES "BusinessOwner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

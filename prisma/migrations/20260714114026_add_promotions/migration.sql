-- CreateTable
CREATE TABLE `Promotion` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(64) NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `bannerText` VARCHAR(191) NOT NULL,
    `percentOff` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `allProducts` BOOLEAN NOT NULL DEFAULT false,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Promotion_code_key`(`code` ASC),
    INDEX `Promotion_active_startsAt_endsAt_idx`(`active` ASC, `startsAt` ASC, `endsAt` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PromotionConsultation` (
    `promotionId` INTEGER NOT NULL,
    `consultationId` INTEGER NOT NULL,

    INDEX `PromotionConsultation_consultationId_idx`(`consultationId` ASC),
    PRIMARY KEY (`promotionId` ASC, `consultationId` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Booking`
    ADD COLUMN `originalPriceCents` INTEGER NULL,
    ADD COLUMN `paidAmountCents` INTEGER NULL,
    ADD COLUMN `promotionCode` VARCHAR(64) NULL,
    ADD COLUMN `discountPercent` INTEGER NULL,
    ADD COLUMN `promotionId` INTEGER NULL;

-- Backfill existing paid orders before making the price snapshot required.
UPDATE `Booking`
INNER JOIN `Consultation` ON `Consultation`.`id` = `Booking`.`consultationId`
SET
    `Booking`.`originalPriceCents` = `Consultation`.`price` * 100,
    `Booking`.`paidAmountCents` = `Consultation`.`price` * 100;

ALTER TABLE `Booking`
    MODIFY `originalPriceCents` INTEGER NOT NULL,
    MODIFY `paidAmountCents` INTEGER NOT NULL;

CREATE INDEX `Booking_promotionId_idx` ON `Booking`(`promotionId` ASC);

-- AddForeignKey
ALTER TABLE `PromotionConsultation` ADD CONSTRAINT `PromotionConsultation_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PromotionConsultation` ADD CONSTRAINT `PromotionConsultation_consultationId_fkey` FOREIGN KEY (`consultationId`) REFERENCES `Consultation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_promotionId_fkey` FOREIGN KEY (`promotionId`) REFERENCES `Promotion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

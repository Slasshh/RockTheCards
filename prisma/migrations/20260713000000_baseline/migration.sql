-- CreateTable
CREATE TABLE `Booking` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NULL,
    `firstName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `message` VARCHAR(191) NULL,
    `preferredDate` DATETIME(3) NULL,
    `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `orderStatus` VARCHAR(191) NOT NULL DEFAULT 'new',
    `stripeSessionId` VARCHAR(191) NULL,
    `consultationId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Booking_consultationId_fkey`(`consultationId` ASC),
    UNIQUE INDEX `Booking_stripeSessionId_key`(`stripeSessionId` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Consultation` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `summary` TEXT NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `duration` INTEGER NULL,
    `bookable` BOOLEAN NOT NULL DEFAULT true,
    `unavailableText` TEXT NULL,
    `customerFields` VARCHAR(191) NULL DEFAULT 'name,email',
    `price` INTEGER NOT NULL,
    `focus` VARCHAR(191) NOT NULL,
    `badge` VARCHAR(191) NOT NULL,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `bookingDaysAhead` INTEGER NOT NULL DEFAULT 14,
    `allowSameDayBooking` BOOLEAN NOT NULL DEFAULT true,
    `slotDurationMinutes` INTEGER NOT NULL DEFAULT 60,
    `bookingBufferMinutes` INTEGER NOT NULL DEFAULT 0,
    `disabledWeekdays` VARCHAR(191) NULL,
    `allowedMonths` VARCHAR(191) NULL,
    `disabledMonthDays` VARCHAR(191) NULL,
    `disabledDaysByMonth` TEXT NULL,
    `disableFrenchHolidays` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Consultation_slug_key`(`slug` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_consultationId_fkey` FOREIGN KEY (`consultationId`) REFERENCES `Consultation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

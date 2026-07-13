-- CreateTable
CREATE TABLE `GoogleCalendarConnection` (
    `id` INTEGER NOT NULL,
    `googleAccountId` VARCHAR(255) NOT NULL,
    `googleEmail` VARCHAR(320) NOT NULL,
    `encryptedRefreshToken` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

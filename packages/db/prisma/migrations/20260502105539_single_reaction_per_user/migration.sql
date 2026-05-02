/*
  Warnings:

  - A unique constraint covering the columns `[announcementId,userId]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Reaction_announcementId_userId_emoji_key";

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_announcementId_userId_key" ON "Reaction"("announcementId", "userId");

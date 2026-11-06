-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "bugId" TEXT;

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN     "bugId" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "nextBugNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Bug" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "bugNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "stepsToReproduce" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "severity" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "environment" TEXT,
    "externalRef" TEXT,
    "assignedToId" TEXT,
    "reportedById" TEXT NOT NULL,
    "testCaseId" TEXT,
    "runCaseId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bug_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Bug_projectId_status_createdAt_idx" ON "Bug"("projectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Bug_projectId_severity_idx" ON "Bug"("projectId", "severity");

-- CreateIndex
CREATE INDEX "Bug_assignedToId_status_idx" ON "Bug"("assignedToId", "status");

-- CreateIndex
CREATE INDEX "Bug_reportedById_idx" ON "Bug"("reportedById");

-- CreateIndex
CREATE INDEX "Bug_testCaseId_idx" ON "Bug"("testCaseId");

-- CreateIndex
CREATE INDEX "Bug_runCaseId_idx" ON "Bug"("runCaseId");

-- CreateIndex
CREATE INDEX "Bug_createdAt_idx" ON "Bug"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bug_projectId_bugNumber_key" ON "Bug"("projectId", "bugNumber");

-- CreateIndex
CREATE INDEX "Attachment_bugId_idx" ON "Attachment"("bugId");

-- CreateIndex
CREATE INDEX "Comment_bugId_createdAt_idx" ON "Comment"("bugId", "createdAt");

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bug" ADD CONSTRAINT "Bug_runCaseId_fkey" FOREIGN KEY ("runCaseId") REFERENCES "TestRunCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_bugId_fkey" FOREIGN KEY ("bugId") REFERENCES "Bug"("id") ON DELETE CASCADE ON UPDATE CASCADE;


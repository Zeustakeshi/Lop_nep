-- CreateEnum
CREATE TYPE "ClassSetupStatus" AS ENUM ('DRAFT', 'COMPLETE', 'NEEDS_SCHEDULE', 'NEEDS_TUITION');

-- AlterTable
ALTER TABLE "Class" ADD COLUMN "setupStatus" "ClassSetupStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN "currentSetupStep" TEXT;

-- DropForeignKey
ALTER TABLE "ParentContact" DROP CONSTRAINT "ParentContact_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Report" DROP CONSTRAINT "Report_studentId_fkey";

-- DropForeignKey
ALTER TABLE "ClassStudent" DROP CONSTRAINT "ClassStudent_studentId_fkey";

-- DropIndex
DROP INDEX "ClassStudent_classId_studentId_key";

-- DropIndex
DROP INDEX "Attendance_lessonId_studentId_key";

-- AlterTable
ALTER TABLE "ClassStudent" ADD COLUMN "teacherId" TEXT,
ADD COLUMN "fullName" TEXT,
ADD COLUMN "nickname" TEXT,
ADD COLUMN "birthDate" TIMESTAMP(3),
ADD COLUMN "schoolLevel" TEXT,
ADD COLUMN "note" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "ClassStudent" cs
SET "teacherId" = c."teacherId",
    "fullName" = s."fullName",
    "nickname" = s."nickname",
    "birthDate" = s."birthDate",
    "schoolLevel" = s."schoolLevel",
    "note" = s."note",
    "createdAt" = s."createdAt",
    "updatedAt" = s."updatedAt"
FROM "Class" c, "Student" s
WHERE cs."classId" = c."id" AND cs."studentId" = s."id";

ALTER TABLE "ClassStudent" ALTER COLUMN "teacherId" SET NOT NULL,
ALTER COLUMN "fullName" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "ParentContact" ADD COLUMN "classStudentId" TEXT;

UPDATE "ParentContact" pc
SET "classStudentId" = cs."id"
FROM "ClassStudent" cs
WHERE pc."studentId" = cs."studentId"
AND pc."teacherId" = cs."teacherId"
AND pc."classStudentId" IS NULL;

DELETE FROM "ParentContact" WHERE "classStudentId" IS NULL;

ALTER TABLE "ParentContact" ALTER COLUMN "classStudentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN "classStudentId" TEXT;

UPDATE "Attendance" a
SET "classStudentId" = cs."id"
FROM "LessonSession" l, "ClassStudent" cs
WHERE a."lessonId" = l."id"
AND l."classId" = cs."classId"
AND a."studentId" = cs."studentId"
AND a."classStudentId" IS NULL;

DELETE FROM "Attendance" WHERE "classStudentId" IS NULL;

ALTER TABLE "Attendance" ALTER COLUMN "classStudentId" SET NOT NULL;

-- AlterTable
ALTER TABLE "Report" ADD COLUMN "classStudentId" TEXT;

UPDATE "Report" r
SET "classStudentId" = cs."id"
FROM "ClassStudent" cs
WHERE r."classId" = cs."classId"
AND r."studentId" = cs."studentId"
AND r."classStudentId" IS NULL;

-- AlterTable
ALTER TABLE "ParentContact" DROP COLUMN "studentId";

ALTER TABLE "Attendance" DROP COLUMN "studentId";

ALTER TABLE "Report" DROP COLUMN "studentId";

ALTER TABLE "ClassStudent" DROP COLUMN "studentId";

-- DropTable
DROP TABLE "Student";

-- CreateIndex
CREATE INDEX "ClassStudent_teacherId_status_idx" ON "ClassStudent"("teacherId", "status");

-- CreateIndex
CREATE INDEX "ClassStudent_classId_status_idx" ON "ClassStudent"("classId", "status");

-- CreateIndex
CREATE INDEX "ParentContact_classStudentId_idx" ON "ParentContact"("classStudentId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_lessonId_classStudentId_key" ON "Attendance"("lessonId", "classStudentId");

-- AddForeignKey
ALTER TABLE "ClassStudent" ADD CONSTRAINT "ClassStudent_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentContact" ADD CONSTRAINT "ParentContact_classStudentId_fkey" FOREIGN KEY ("classStudentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_classStudentId_fkey" FOREIGN KEY ("classStudentId") REFERENCES "ClassStudent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_classStudentId_fkey" FOREIGN KEY ("classStudentId") REFERENCES "ClassStudent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

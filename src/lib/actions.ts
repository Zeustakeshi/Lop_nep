"use server";

import crypto from "node:crypto";
import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { calculateReportTotals, defaultBillableAmount } from "@/lib/tuition";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function intValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return undefined;
  const parsed = Number(value.replace(/[^\d]/g, ""));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? dateOnlyValue(value) : undefined;
}

function dateOnlyValue(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function localDateOnlyValue(date: Date) {
  return dateOnlyValue(
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
  );
}

function timeRangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  return startA < endB && startB < endA;
}

async function assertTeacherHasNoLessonConflict({
  teacherId,
  lessonDate,
  startTime,
  endTime,
  excludeLessonId
}: {
  teacherId: string;
  lessonDate: Date;
  startTime: string;
  endTime: string;
  excludeLessonId?: string;
}) {
  const sameDayLessons = await prisma.lessonSession.findMany({
    where: {
      id: excludeLessonId ? { not: excludeLessonId } : undefined,
      lessonDate,
      status: { not: "CANCELLED" },
      class: { teacherId }
    },
    select: { startTime: true, endTime: true, class: { select: { name: true } } }
  });
  const conflict = sameDayLessons.find((lesson) =>
    timeRangesOverlap(startTime, endTime, lesson.startTime, lesson.endTime)
  );
  if (conflict) {
    throw new Error(`Giáo viên đã có lớp ${conflict.class.name} trong khung giờ này.`);
  }
}

async function assertTeacherHasNoScheduleConflict({
  teacherId,
  dayOfWeek,
  startTime,
  endTime,
  effectiveFrom,
  effectiveTo,
  excludeScheduleId
}: {
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  excludeScheduleId?: string;
}) {
  const schedules = await prisma.classSchedule.findMany({
    where: {
      id: excludeScheduleId ? { not: excludeScheduleId } : undefined,
      dayOfWeek,
      status: "ACTIVE",
      class: { teacherId, status: "ACTIVE" }
    },
    select: {
      startTime: true,
      endTime: true,
      effectiveFrom: true,
      effectiveTo: true,
      class: { select: { name: true } }
    }
  });
  const conflict = schedules.find((schedule) => {
    const periodsOverlap =
      (!effectiveTo || schedule.effectiveFrom <= effectiveTo) &&
      (!schedule.effectiveTo || effectiveFrom <= schedule.effectiveTo);
    return periodsOverlap && timeRangesOverlap(startTime, endTime, schedule.startTime, schedule.endTime);
  });
  if (conflict) {
    throw new Error(`Giáo viên đã có lịch lớp ${conflict.class.name} trong khung giờ này.`);
  }
}

async function createUpcomingLessonsForSchedule({
  scheduleId,
  classId,
  dayOfWeek,
  startTime,
  endTime,
  effectiveFrom,
  effectiveTo,
  daysAhead = 62
}: {
  scheduleId: string;
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  daysAhead?: number;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeStart = effectiveFrom > today ? effectiveFrom : today;
  const rangeEnd = new Date(today);
  rangeEnd.setDate(rangeEnd.getDate() + daysAhead);
  const effectiveEnd = effectiveTo && effectiveTo < rangeEnd ? effectiveTo : rangeEnd;
  const lessons: Prisma.LessonSessionCreateManyInput[] = [];

  for (const day = new Date(rangeStart); day <= effectiveEnd; day.setDate(day.getDate() + 1)) {
    if (day.getDay() !== dayOfWeek) continue;
    lessons.push({
      classId,
      scheduleId,
      lessonDate: localDateOnlyValue(day),
      startTime,
      endTime,
      status: "PLANNED",
      isBillable: false,
      billableAmount: 0
    });
  }

  if (lessons.length) {
    await prisma.lessonSession.createMany({ data: lessons, skipDuplicates: true });
  }
}

export async function createClass(formData: FormData) {
  const teacher = await requireTeacher();
  const className = text(formData, "name");
  const subject = text(formData, "subject");

  if (!className || !subject) {
    throw new Error("Tên lớp và môn học là bắt buộc.");
  }

  const created = await prisma.class.create({
    data: {
      teacherId: teacher.id,
      name: className,
      subject,
      description: text(formData, "description"),
      setupStatus: "DRAFT",
      currentSetupStep: "STUDENTS",
      internalNote: text(formData, "internalNote"),
      startDate: dateValue(formData, "startDate")
    }
  });

  revalidatePath("/classes");
  redirect(`/classes/${created.id}/students`);
}

export async function updateClassStatus(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const status = text(formData, "status");
  if (!classId || !status) throw new Error("Thiếu dữ liệu cập nhật lớp.");

  await prisma.class.update({
    where: { id: classId, teacherId: teacher.id },
    data: { status: status as never }
  });

  revalidatePath("/classes");
}

export async function createClassStudent(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const fullName = text(formData, "fullName");
  if (!classId || !fullName) throw new Error("Thiếu lớp hoặc họ tên học sinh.");

  const ownedClass = await prisma.class.findFirst({ where: { id: classId, teacherId: teacher.id } });
  if (!ownedClass) throw new Error("Không tìm thấy lớp.");

  await prisma.classStudent.create({
    data: {
      teacherId: teacher.id,
      classId,
      fullName,
      nickname: text(formData, "nickname"),
      birthDate: dateValue(formData, "birthDate"),
      schoolLevel: text(formData, "schoolLevel"),
      note: text(formData, "note"),
      joinedAt: dateValue(formData, "joinedAt") ?? new Date(),
      customFeePerLesson: intValue(formData, "customFeePerLesson"),
      customMonthlyFee: intValue(formData, "customMonthlyFee")
    }
  });

  await prisma.class.update({
    where: { id: classId },
    data: { currentSetupStep: "SCHEDULE" }
  });

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/classes");
}

export async function createClassStudentsBulk(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const rows = text(formData, "students");
  if (!classId || !rows) throw new Error("Hãy nhập ít nhất một học sinh.");
  const ownedClass = await prisma.class.findFirst({ where: { id: classId, teacherId: teacher.id } });
  if (!ownedClass) throw new Error("Không tìm thấy lớp.");

  const students = rows
    .split(/\r?\n/)
    .map((row) => row.split(/[|,\t]/).map((value) => value.trim()))
    .filter(([fullName]) => Boolean(fullName));
  if (!students.length) throw new Error("Hãy nhập ít nhất một học sinh.");

  await prisma.$transaction(
    students.map(([fullName, schoolLevel, parentPhone]) =>
      prisma.classStudent.create({
        data: {
          teacherId: teacher.id,
          classId,
          fullName,
          schoolLevel: schoolLevel || undefined,
          parents: parentPhone
            ? { create: { teacherId: teacher.id, fullName: `Phụ huynh ${fullName}`, phone: parentPhone } }
            : undefined
        }
      })
    )
  );
  await prisma.class.update({ where: { id: classId }, data: { currentSetupStep: "SCHEDULE" } });
  revalidatePath(`/classes/${classId}`);
  revalidatePath(`/classes/${classId}/students`);
  revalidatePath("/classes");
}

export async function addParentContact(formData: FormData) {
  const teacher = await requireTeacher();
  const classStudentId = text(formData, "classStudentId");
  const fullName = text(formData, "fullName");
  if (!classStudentId || !fullName) throw new Error("Thiếu học sinh hoặc tên phụ huynh.");

  const classStudent = await prisma.classStudent.findFirst({
    where: { id: classStudentId, teacherId: teacher.id }
  });
  if (!classStudent) throw new Error("Không tìm thấy học sinh trong lớp.");

  await prisma.parentContact.create({
    data: {
      teacherId: teacher.id,
      classStudentId,
      fullName,
      phone: text(formData, "phone"),
      email: text(formData, "email"),
      relationship: text(formData, "relationship"),
      preferredChannel: text(formData, "preferredChannel"),
      paymentNote: text(formData, "paymentNote")
    }
  });

  revalidatePath(`/classes/${classStudent.classId}`);
}

export async function updateClassStudentStatus(formData: FormData) {
  const teacher = await requireTeacher();
  const classStudentId = text(formData, "classStudentId");
  const status = text(formData, "status");
  if (!classStudentId || !status) throw new Error("Thiếu học sinh hoặc trạng thái.");

  const classStudent = await prisma.classStudent.findFirst({
    where: { id: classStudentId, teacherId: teacher.id }
  });
  if (!classStudent) throw new Error("Không tìm thấy học sinh trong lớp.");

  await prisma.classStudent.update({
    where: { id: classStudentId },
    data: {
      status: status as never,
      leftAt: status === "LEFT" ? new Date() : null
    }
  });

  revalidatePath(`/classes/${classStudent.classId}`);
}

export async function updateTuitionConfig(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const updatePastLessons = text(formData, "updatePastLessons") === "true";
  if (!classId) throw new Error("Thiếu lớp.");

  const ownedClass = await prisma.class.findFirst({ where: { id: classId, teacherId: teacher.id } });
  if (!ownedClass) throw new Error("Không tìm thấy lớp.");

  const type = text(formData, "tuitionType") as string;

  // Validation theo từng loại
  if (type === "THEO_BUOI") {
    const feePerLesson = intValue(formData, "feePerLesson");
    if (!feePerLesson || feePerLesson <= 0) {
      throw new Error("Vui lòng nhập số tiền mỗi buổi học.");
    }
  } else if (type === "THEO_THANG") {
    const fixedMonthlyFee = intValue(formData, "fixedMonthlyFee");
    if (!fixedMonthlyFee || fixedMonthlyFee <= 0) {
      throw new Error("Vui lòng nhập số tiền cố định hàng tháng.");
    }
  } else if (type === "THEO_GOI") {
    // Coming soon - không cần validate
  }

  const tuition = await prisma.tuitionConfig.upsert({
    where: { classId },
    update: {
      type: type as never,
      feePerLesson: intValue(formData, "feePerLesson"),
      fixedMonthlyFee: intValue(formData, "fixedMonthlyFee"),
      packageLessons: intValue(formData, "packageLessons"),
      packagePrice: intValue(formData, "packagePrice")
    },
    create: {
      classId,
      type: type as never,
      feePerLesson: intValue(formData, "feePerLesson"),
      fixedMonthlyFee: intValue(formData, "fixedMonthlyFee"),
      packageLessons: intValue(formData, "packageLessons"),
      packagePrice: intValue(formData, "packagePrice")
    }
  });

  // THEO_BUOI: Cập nhật các buổi học cũ nếu chọn
  if (type === "THEO_BUOI" && updatePastLessons) {
    await prisma.lessonSession.updateMany({
      where: {
        classId,
        status: { in: ["COMPLETED", "TRIAL", "MAKEUP"] },
        customFee: null // Chỉ cập nhật những buổi chưa có customFee
      },
      data: {
        isBillable: true,
        billableAmount: tuition.feePerLesson ?? 0
      }
    });
  } else if (type === "THEO_BUOI") {
    // Chỉ cập nhật những buổi chưa được tính phí
    await prisma.lessonSession.updateMany({
      where: {
        classId,
        status: { in: ["COMPLETED", "TRIAL", "MAKEUP"] },
        isBillable: false,
        billableAmount: 0,
        customFee: null
      },
      data: {
        isBillable: true,
        billableAmount: tuition.feePerLesson ?? 0
      }
    });
  }
  // THEO_THANG: Không cập nhật tự động từng buổi - tiền cố định theo tháng
  // THEO_GOI: Coming soon

  await prisma.class.update({
    where: { id: classId },
    data: { setupStatus: "COMPLETE", currentSetupStep: null }
  });

  revalidatePath(`/classes/${classId}`);
  revalidatePath("/classes");
}

export async function createSchedule(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const dayOfWeek = text(formData, "dayOfWeek");
  const startTime = text(formData, "startTime");
  const endTime = text(formData, "endTime");
  if (!classId || !dayOfWeek || !startTime || !endTime) throw new Error("Thiếu thông tin lịch học.");

  const ownedClass = await prisma.class.findFirst({ where: { id: classId, teacherId: teacher.id } });
  if (!ownedClass) throw new Error("Không tìm thấy lớp.");

  if (startTime >= endTime) throw new Error("Khung giờ lịch học không hợp lệ.");
  const effectiveFrom = dateValue(formData, "effectiveFrom") ?? new Date();
  await assertTeacherHasNoScheduleConflict({
    teacherId: teacher.id,
    dayOfWeek: Number(dayOfWeek),
    startTime,
    endTime,
    effectiveFrom,
    effectiveTo: null
  });

  const schedule = await prisma.classSchedule.create({
    data: {
      classId,
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
      location: text(formData, "location"),
      learningMode: text(formData, "learningMode") ?? "offline",
      effectiveFrom
    }
  });

  await createUpcomingLessonsForSchedule({
    scheduleId: schedule.id,
    classId,
    dayOfWeek: schedule.dayOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    effectiveFrom: schedule.effectiveFrom,
    effectiveTo: schedule.effectiveTo
  });

  await prisma.class.update({
    where: { id: classId },
    data: { setupStatus: "NEEDS_TUITION", currentSetupStep: "TUITION" }
  });

  revalidatePath(`/classes/${classId}`);
  revalidatePath(`/classes/${classId}/schedule`);
  revalidatePath("/schedule");
}

export async function updateScheduleTime({
  scheduleId,
  dayOfWeek,
  startTime,
  endTime
}: {
  scheduleId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const teacher = await requireTeacher();
  if (!scheduleId || !Number.isInteger(dayOfWeek) || !startTime || !endTime) {
    throw new Error("Thiếu thông tin lịch học.");
  }

  const schedule = await prisma.classSchedule.findFirst({
    where: { id: scheduleId, class: { teacherId: teacher.id } }
  });
  if (!schedule) throw new Error("Không tìm thấy lịch học.");
  if (dayOfWeek < 0 || dayOfWeek > 6 || startTime >= endTime) {
    throw new Error("Khung giờ lịch học không hợp lệ.");
  }

  await assertTeacherHasNoScheduleConflict({
    teacherId: teacher.id,
    dayOfWeek,
    startTime,
    endTime,
    effectiveFrom: schedule.effectiveFrom,
    effectiveTo: schedule.effectiveTo,
    excludeScheduleId: scheduleId
  });

  await prisma.classSchedule.update({
    where: { id: scheduleId },
    data: { dayOfWeek, startTime, endTime }
  });

  const today = dateOnlyValue(new Date().toISOString().slice(0, 10));
  const futureLessons = await prisma.lessonSession.findMany({
    where: { scheduleId, lessonDate: { gte: today }, status: "PLANNED" }
  });
  const dayOffset = dayOfWeek - schedule.dayOfWeek;
  await prisma.$transaction(
    futureLessons.map((lesson) => {
      const lessonDate = new Date(lesson.lessonDate);
      lessonDate.setUTCDate(lessonDate.getUTCDate() + dayOffset);
      return prisma.lessonSession.update({
        where: { id: lesson.id },
        data: { lessonDate, startTime, endTime }
      });
    })
  );
  await createUpcomingLessonsForSchedule({
    scheduleId,
    classId: schedule.classId,
    dayOfWeek,
    startTime,
    endTime,
    effectiveFrom: schedule.effectiveFrom,
    effectiveTo: schedule.effectiveTo
  });

  revalidatePath(`/classes/${schedule.classId}`);
  revalidatePath(`/classes/${schedule.classId}/schedule`);
  revalidatePath("/schedule");
}

export async function createLesson(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const lessonDate = dateValue(formData, "lessonDate");
  const startTime = text(formData, "startTime");
  const endTime = text(formData, "endTime");
  if (!classId || !lessonDate || !startTime || !endTime) throw new Error("Thiếu thông tin buổi học.");

  const ownedClass = await prisma.class.findFirst({
    where: { id: classId, teacherId: teacher.id },
    include: { tuition: true }
  });
  if (!ownedClass) throw new Error("Không tìm thấy lớp.");

  const status = (text(formData, "status") ?? "PLANNED") as never;
  const bill = defaultBillableAmount(status as never, ownedClass.tuition);
  const manualAmount = intValue(formData, "billableAmount");

  if (startTime >= endTime) throw new Error("Khung giờ buổi học không hợp lệ.");
  await assertTeacherHasNoLessonConflict({ teacherId: teacher.id, lessonDate, startTime, endTime });

  await prisma.lessonSession.create({
    data: {
      classId,
      lessonDate,
      startTime,
      endTime,
      status,
      taughtContent: text(formData, "taughtContent"),
      homework: text(formData, "homework"),
      internalNote: text(formData, "internalNote"),
      parentNote: text(formData, "parentNote"),
      isBillable: formData.get("isBillable") === "on" || bill.isBillable,
      billableAmount: manualAmount ?? bill.amount
    }
  });

  revalidatePath("/lessons");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${classId}`);
}

export async function updateLesson(formData: FormData) {
  const teacher = await requireTeacher();
  const lessonId = text(formData, "lessonId");
  if (!lessonId) throw new Error("Thiếu buổi học.");

  const lesson = await prisma.lessonSession.findFirst({
    where: { id: lessonId, class: { teacherId: teacher.id } },
    include: { class: { include: { tuition: true } } }
  });
  if (!lesson) throw new Error("Không tìm thấy buổi học.");

  const status = (text(formData, "status") ?? lesson.status) as never;
  const bill = defaultBillableAmount(status as never, lesson.class.tuition);
  const manualAmount = intValue(formData, "billableAmount");
  const lessonDateInput = text(formData, "lessonDate");
  const startTime = text(formData, "startTime") ?? lesson.startTime;
  const endTime = text(formData, "endTime") ?? lesson.endTime;
  const lessonDate = lessonDateInput ? dateOnlyValue(lessonDateInput) : lesson.lessonDate;

  if (startTime >= endTime) {
    throw new Error("Khung giờ buổi học không hợp lệ.");
  }

  await assertTeacherHasNoLessonConflict({
    teacherId: teacher.id,
    lessonDate,
    startTime,
    endTime,
    excludeLessonId: lessonId
  });

  await prisma.lessonSession.update({
    where: { id: lessonId },
    data: {
      lessonDate,
      startTime,
      endTime,
      status,
      taughtContent: text(formData, "taughtContent"),
      homework: text(formData, "homework"),
      internalNote: text(formData, "internalNote"),
      parentNote: text(formData, "parentNote"),
      isBillable: formData.get("isBillable") === "on" || bill.isBillable,
      billableAmount: manualAmount ?? bill.amount
    }
  });

  // Tự động đồng bộ lại các báo cáo liên quan
  const monthKey = `${lessonDate.getUTCFullYear()}-${String(lessonDate.getUTCMonth() + 1).padStart(2, "0")}`;
  await syncReportsForMonth(teacher.id, lesson.classId, monthKey);

  revalidatePath("/lessons");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${lesson.classId}`);
}

export async function updateLessonTime({
  lessonId,
  lessonDate,
  startTime,
  endTime
}: {
  lessonId: string;
  lessonDate: string;
  startTime: string;
  endTime: string;
}) {
  const teacher = await requireTeacher();
  if (!lessonId || !lessonDate || !startTime || !endTime) {
    throw new Error("Thiếu thông tin thời gian buổi học.");
  }

  const lesson = await prisma.lessonSession.findFirst({
    where: { id: lessonId, class: { teacherId: teacher.id } }
  });
  if (!lesson) throw new Error("Không tìm thấy buổi học.");

  const nextStart = new Date(`${lessonDate}T${startTime}`);
  const nextEnd = new Date(`${lessonDate}T${endTime}`);
  if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextStart >= nextEnd) {
    throw new Error("Khung giờ buổi học không hợp lệ.");
  }

  const nextLessonDate = dateOnlyValue(lessonDate);
  await assertTeacherHasNoLessonConflict({
    teacherId: teacher.id,
    lessonDate: nextLessonDate,
    startTime,
    endTime,
    excludeLessonId: lessonId
  });

  try {
    await prisma.lessonSession.update({
      where: { id: lessonId },
      data: {
        lessonDate: nextLessonDate,
        startTime,
        endTime
      }
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      throw new Error("Lớp này đã có buổi học trong đúng khung giờ đó.");
    }
    throw error;
  }

  revalidatePath("/lessons");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${lesson.classId}`);
}

export async function quickUpdateLessonStatus({ lessonId, status }: { lessonId: string; status: string }) {
  const teacher = await requireTeacher();
  const lesson = await prisma.lessonSession.findFirst({
    where: { id: lessonId, class: { teacherId: teacher.id } },
    include: { class: { include: { tuition: true } } }
  });
  if (!lesson) throw new Error("Không tìm thấy buổi học.");

  const allowedStatuses = ["COMPLETED", "STUDENT_ABSENT", "TEACHER_ABSENT", "CANCELLED", "MAKEUP"];
  if (!allowedStatuses.includes(status)) throw new Error("Trạng thái không hợp lệ.");
  const bill = defaultBillableAmount(status as never, lesson.class.tuition);

  await prisma.lessonSession.update({
    where: { id: lessonId },
    data: { status: status as never, isBillable: bill.isBillable, billableAmount: bill.amount }
  });
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${lesson.classId}`);
}

export async function deleteLesson(lessonId: string) {
  const teacher = await requireTeacher();
  const lesson = await prisma.lessonSession.findFirst({
    where: { id: lessonId, class: { teacherId: teacher.id } }
  });
  if (!lesson) throw new Error("Không tìm thấy buổi học.");

  await prisma.lessonSession.delete({ where: { id: lessonId } });
  revalidatePath("/dashboard");
  revalidatePath("/lessons");
  revalidatePath("/schedule");
  revalidatePath(`/classes/${lesson.classId}`);
}

export async function updateLessonCustomFee(formData: FormData) {
  const teacher = await requireTeacher();
  const lessonId = text(formData, "lessonId");
  const customFeeValue = intValue(formData, "customFee");

  if (!lessonId) throw new Error("Thiếu buổi học.");

  const lesson = await prisma.lessonSession.findFirst({
    where: { id: lessonId, class: { teacherId: teacher.id } },
    include: { class: { include: { tuition: true } } }
  });
  if (!lesson) throw new Error("Không tìm thấy buổi học.");

  // Chỉ áp dụng cho THEO_BUOI
  if (lesson.class.tuition?.type !== "THEO_BUOI") {
    throw new Error("Chỉ có thể tùy chỉnh giá buổi học khi chế độ tính tiền là THEO_BUOI.");
  }

  await prisma.lessonSession.update({
    where: { id: lessonId },
    data: {
      customFee: customFeeValue ?? null
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/lessons");
  revalidatePath(`/classes/${lesson.classId}`);
}

export async function generateLessonsForMonth(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const month = text(formData, "month");
  if (!classId || !month) throw new Error("Thiếu lớp hoặc tháng.");

  const ownedClass = await prisma.class.findFirst({
    where: { id: classId, teacherId: teacher.id },
    include: { schedules: { where: { status: "ACTIVE" } }, tuition: true }
  });
  if (!ownedClass) throw new Error("Không tìm thấy lớp.");

  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);
  const created: Prisma.LessonSessionCreateManyInput[] = [];

  for (const schedule of ownedClass.schedules) {
    const effectiveStart = schedule.effectiveFrom > start ? schedule.effectiveFrom : start;
    const effectiveEnd = schedule.effectiveTo && schedule.effectiveTo < end ? schedule.effectiveTo : end;
    for (let day = new Date(effectiveStart); day <= effectiveEnd; day.setDate(day.getDate() + 1)) {
      if (day.getDay() !== schedule.dayOfWeek) continue;
      created.push({
        classId,
        scheduleId: schedule.id,
        lessonDate: new Date(day),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        status: "PLANNED",
        isBillable: false,
        billableAmount: 0
      });
    }
  }

  if (created.length) {
    await prisma.lessonSession.createMany({
      data: created,
      skipDuplicates: true
    });
  }

  revalidatePath("/schedule");
  revalidatePath(`/classes/${classId}`);
}

export async function createReport(formData: FormData) {
  const teacher = await requireTeacher();
  const classId = text(formData, "classId");
  const selection = text(formData, "classStudentSelection");
  const selectedParts = selection?.split(":");
  const selectedClassId = selectedParts?.length === 2 ? selectedParts[0] : undefined;
  const rawStudentId = selectedParts?.length === 2 ? selectedParts[1] : text(formData, "classStudentId");
  const classStudentId = rawStudentId && rawStudentId !== "__CLASS__" ? rawStudentId : undefined;
  const month = text(formData, "month");
  const effectiveClassId = selectedClassId ?? classId;
  if (!effectiveClassId || !month) throw new Error("Thiếu học sinh hoặc tháng báo cáo.");

  const ownedClass = await prisma.class.findFirst({
    where: { id: effectiveClassId, teacherId: teacher.id },
    include: {
      tuition: true,
      students: true
    }
  });
  if (!ownedClass) throw new Error("Không tìm thấy lớp.");
  const selectedStudent = classStudentId
    ? ownedClass.students.find((student) => student.id === classStudentId)
    : undefined;
  if (classStudentId && !selectedStudent) throw new Error("Học sinh không thuộc lớp đã chọn.");

  const existingReport = await prisma.report.findFirst({
    where: {
      teacherId: teacher.id,
      classId: effectiveClassId,
      classStudentId: classStudentId || null,
      reportMonth: month
    },
    select: { id: true }
  });
  if (existingReport) redirect(`/reports/${existingReport.id}`);

  const [year, monthIndex] = month.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);
  const lessons = await prisma.lessonSession.findMany({
    where: {
      classId: effectiveClassId,
      lessonDate: { gte: start, lt: end }
    },
    orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }]
  });

  const discountAmount = intValue(formData, "discountAmount") ?? 0;
  const surchargeAmount = intValue(formData, "surchargeAmount") ?? 0;
  const manualAmount = intValue(formData, "manualAmount");
  const reportLessons = lessons.map((lesson) => {
    const wasLearned = lesson.status === "COMPLETED" || lesson.status === "TRIAL" || lesson.status === "MAKEUP";
    return {
      ...lesson,
      isBillable: wasLearned && lesson.isBillable,
      billableAmount: wasLearned ? lesson.billableAmount : 0
    };
  });
  const tuition = ownedClass.tuition;
  const totals = calculateReportTotals({
    lessons: reportLessons,
    tuition,
    discountAmount,
    surchargeAmount
  });
  const totalAmount = totals.totalAmount;

  const report = await prisma.report.create({
    data: {
      teacherId: teacher.id,
      classId: effectiveClassId,
      classStudentId: classStudentId || null,
      reportMonth: month,
      status: "FINALIZED",
      paymentStatus: "UNPAID",
      totalLessons: totals.totalLessons,
      billableLessons: totals.billableLessons,
      subtotalAmount: totals.subtotalAmount,
      discountAmount,
      surchargeAmount,
      totalAmount,
      remainingAmount: totalAmount,
      shareToken: crypto.randomBytes(24).toString("hex"),
      finalizedAt: new Date(),
      paymentDueDate: dateValue(formData, "paymentDueDate"),
      teacherNote: text(formData, "teacherNote"),
      paymentNote: text(formData, "paymentNote") ?? teacher.defaultPaymentNote,
      snapshot: {
        teacher: {
          name: teacher.name,
          phone: teacher.phone,
          email: teacher.email,
          bankName: teacher.bankName,
          bankAccountName: teacher.bankAccountName,
          bankAccountNumber: teacher.bankAccountNumber,
          paymentQrUrl: teacher.paymentQrUrl
        },
        class: {
          name: ownedClass.name,
          subject: ownedClass.subject
        },
        students: (selectedStudent ? [selectedStudent] : ownedClass.students).map((item) => ({
          id: item.id,
          fullName: item.fullName,
          nickname: item.nickname
        })),
        lessons: reportLessons.map((lesson) => ({
          id: lesson.id,
          lessonDate: lesson.lessonDate,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          status: lesson.status,
          taughtContent: lesson.taughtContent,
          homework: lesson.homework,
          parentNote: lesson.parentNote,
          isBillable: lesson.isBillable,
          billableAmount: lesson.billableAmount
        })),
        tuition
      }
    }
  });

  revalidatePath("/reports");
  redirect(`/reports/${report.id}`);
}

export async function recalculateReport(formData: FormData) {
  const teacher = await requireTeacher();
  const reportId = text(formData, "reportId");
  if (!reportId) throw new Error("Thiếu báo cáo.");

  const report = await prisma.report.findFirst({
    where: { id: reportId, teacherId: teacher.id },
    include: { class: { include: { tuition: true, students: true } } }
  });
  if (!report) throw new Error("Không tìm thấy báo cáo.");

  await syncSingleReport(report.id);
  revalidatePath(`/reports/${reportId}`);
  revalidatePath(`/report/${report.shareToken}`);
}

async function syncSingleReport(reportId: string) {
  const report = await prisma.report.findFirst({
    where: { id: reportId },
    include: { class: { include: { tuition: true, students: true } } }
  });
  if (!report) return;

  const [year, monthIndex] = report.reportMonth.split("-").map(Number);
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 1);
  const lessons = await prisma.lessonSession.findMany({
    where: {
      classId: report.classId,
      lessonDate: { gte: start, lt: end }
    },
    orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }]
  });

  const reportLessons = lessons.map((lesson) => {
    const wasLearned = lesson.status === "COMPLETED" || lesson.status === "TRIAL" || lesson.status === "MAKEUP";
    return {
      ...lesson,
      isBillable: wasLearned && lesson.isBillable,
      billableAmount: wasLearned ? lesson.billableAmount : 0
    };
  });

  const totals = calculateReportTotals({
    lessons: reportLessons,
    tuition: report.class.tuition,
    discountAmount: report.discountAmount,
    surchargeAmount: report.surchargeAmount
  });

  const totalAmount = totals.totalAmount;
  const remainingAmount = Math.max(totalAmount - report.paidAmount, 0);

  await prisma.report.update({
    where: { id: report.id },
    data: {
      totalLessons: totals.totalLessons,
      billableLessons: totals.billableLessons,
      subtotalAmount: totals.subtotalAmount,
      totalAmount,
      remainingAmount,
      snapshot: {
        ...(report.snapshot as object),
        lessons: reportLessons.map((lesson) => ({
          id: lesson.id,
          lessonDate: lesson.lessonDate,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          status: lesson.status,
          taughtContent: lesson.taughtContent,
          homework: lesson.homework,
          parentNote: lesson.parentNote,
          isBillable: lesson.isBillable,
          billableAmount: lesson.billableAmount
        })),
        tuition: report.class.tuition
      }
    }
  });
}

async function syncReportsForMonth(teacherId: string, classId: string, reportMonth: string) {
  const reports = await prisma.report.findMany({
    where: { teacherId, classId, reportMonth }
  });
  for (const report of reports) {
    await syncSingleReport(report.id);
  }
}

export async function toggleReportLink(formData: FormData) {
  const teacher = await requireTeacher();
  const reportId = text(formData, "reportId");
  if (!reportId) throw new Error("Thiếu báo cáo.");

  const report = await prisma.report.findFirst({ where: { id: reportId, teacherId: teacher.id } });
  if (!report) throw new Error("Không tìm thấy báo cáo.");

  await prisma.report.update({
    where: { id: reportId },
    data: { isShareEnabled: !report.isShareEnabled }
  });

  revalidatePath(`/reports/${reportId}`);
}

export async function rotateReportToken(formData: FormData) {
  const teacher = await requireTeacher();
  const reportId = text(formData, "reportId");
  if (!reportId) throw new Error("Thiếu báo cáo.");

  const report = await prisma.report.findFirst({ where: { id: reportId, teacherId: teacher.id } });
  if (!report) throw new Error("Không tìm thấy báo cáo.");

  await prisma.report.update({
    where: { id: reportId },
    data: { shareToken: crypto.randomBytes(24).toString("hex"), isShareEnabled: true }
  });

  revalidatePath(`/reports/${reportId}`);
}

export async function addPayment(formData: FormData) {
  const teacher = await requireTeacher();
  const reportId = text(formData, "reportId");
  const amount = intValue(formData, "amount");
  if (!reportId || !amount) throw new Error("Thiếu báo cáo hoặc số tiền.");

  const report = await prisma.report.findFirst({ where: { id: reportId, teacherId: teacher.id } });
  if (!report) throw new Error("Không tìm thấy báo cáo.");

  await prisma.payment.create({
    data: {
      reportId,
      amount,
      paidAt: dateValue(formData, "paidAt") ?? new Date(),
      method: text(formData, "method"),
      note: text(formData, "note")
    }
  });

  const paidAmount = report.paidAmount + amount;
  const remainingAmount = Math.max(report.totalAmount - paidAmount, 0);
  await prisma.report.update({
    where: { id: reportId },
    data: {
      paidAmount,
      remainingAmount,
      paymentStatus: remainingAmount === 0 ? "PAID" : "PARTIAL"
    }
  });

  revalidatePath("/payments");
  revalidatePath(`/reports/${reportId}`);
}

export async function markReportPaid(reportId: string) {
  const teacher = await requireTeacher();
  const report = await prisma.report.findFirst({ where: { id: reportId, teacherId: teacher.id } });
  if (!report) throw new Error("Không tìm thấy báo cáo.");
  if (report.remainingAmount <= 0) return;

  await prisma.$transaction([
    prisma.payment.create({
      data: { reportId, amount: report.remainingAmount, paidAt: new Date(), method: "Chuyển khoản" }
    }),
    prisma.report.update({
      where: { id: reportId },
      data: { paidAmount: report.totalAmount, remainingAmount: 0, paymentStatus: "PAID" }
    })
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/payments");
  revalidatePath("/reports");
  revalidatePath(`/reports/${reportId}`);
}

export async function updateSettings(formData: FormData) {
  const teacher = await requireTeacher();

  await prisma.teacher.update({
    where: { id: teacher.id },
    data: {
      name: text(formData, "name") ?? teacher.name,
      phone: text(formData, "phone"),
      bankName: text(formData, "bankName"),
      bankAccountName: text(formData, "bankAccountName"),
      bankAccountNumber: text(formData, "bankAccountNumber"),
      paymentQrUrl: text(formData, "paymentQrUrl"),
      defaultPaymentNote: text(formData, "defaultPaymentNote"),
      defaultReportGreeting: text(formData, "defaultReportGreeting"),
      defaultReportFooter: text(formData, "defaultReportFooter")
    }
  });

  revalidatePath("/settings");
  revalidatePath("/reports");
}

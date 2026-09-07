import { PageHeader } from "@/components/page-header";
import { ScheduleOverviewCalendar } from "@/components/schedule-overview-calendar";
import { StatusBadge } from "@/components/status-badge";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateInputKey, formatDate } from "@/lib/format";
import { defaultBillableAmount } from "@/lib/tuition";

export default async function SchedulePage() {
  const teacher = await requireTeacher();
  const rangeStart = new Date();
  rangeStart.setMonth(rangeStart.getMonth() - 2, 1);
  const rangeEnd = new Date();
  rangeEnd.setMonth(rangeEnd.getMonth() + 4, 1);
  const [lessons, classes] = await Promise.all([
    prisma.lessonSession.findMany({
      where: { class: { teacherId: teacher.id }, lessonDate: { gte: rangeStart, lt: rangeEnd } },
      include: { class: { include: { tuition: true } } },
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }]
    }),
    prisma.class.findMany({ where: { teacherId: teacher.id, status: "ACTIVE" }, select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);

  const calendarLessons = lessons.map((lesson) => {
    const defaultStatus = lesson.status === "PLANNED" ? "COMPLETED" : lesson.status;
    const defaultBill = defaultBillableAmount(defaultStatus, lesson.class.tuition);
    const shouldUseDefault = !lesson.isBillable && lesson.billableAmount === 0 && defaultBill.isBillable;

    return {
      id: lesson.id,
      classId: lesson.classId,
      className: lesson.class.name,
      lessonDate: dateInputKey(lesson.lessonDate),
      startTime: lesson.startTime,
      endTime: lesson.endTime,
      status: lesson.status,
      taughtContent: lesson.taughtContent,
      homework: lesson.homework,
      internalNote: lesson.internalNote,
      parentNote: lesson.parentNote,
      isBillable: shouldUseDefault ? true : lesson.isBillable,
      billableAmount: shouldUseDefault ? defaultBill.amount : lesson.billableAmount
    };
  });

  return (
    <>
      <PageHeader title="Lịch dạy" description="Kéo vùng trống để tạo buổi, hoặc bấm vào một buổi để ghi nhận ngay." />
      <section className="card mb-6 p-4">
        <ScheduleOverviewCalendar lessons={calendarLessons} classes={classes} />
      </section>
      <section className="card p-4">
        <table className="table">
          <thead><tr><th>Ngày</th><th>Giờ</th><th>Lớp</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{formatDate(lesson.lessonDate)}</td>
                <td>{lesson.startTime} - {lesson.endTime}</td>
                <td>{lesson.class.name}</td>
                <td><StatusBadge value={lesson.status} /></td>
                <td>{lesson.parentNote ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

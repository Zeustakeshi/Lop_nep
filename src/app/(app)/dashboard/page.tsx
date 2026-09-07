import Link from "next/link";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  CircleAlert,
  FileText,
  WalletCards,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { LessonQuickAction } from "@/components/lesson-quick-action";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonthKey, formatDate, formatMoney } from "@/lib/format";

export default async function DashboardPage() {
  const teacher = await requireTeacher();
  const today = new Date();
  const startToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const endToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const weekEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7,
  );
  const month = currentMonthKey();

  const [
    classCount,
    studentCount,
    todayLessons,
    upcomingLessons,
    reports,
    staleLessons,
    setupClasses,
  ] = await Promise.all([
    prisma.class.count({ where: { teacherId: teacher.id, status: "ACTIVE" } }),
    prisma.classStudent.count({
      where: { teacherId: teacher.id, status: "ACTIVE" },
    }),
    prisma.lessonSession.findMany({
      where: {
        class: { teacherId: teacher.id },
        lessonDate: { gte: startToday, lt: endToday },
      },
      include: { class: true },
      orderBy: { startTime: "asc" },
    }),
    prisma.lessonSession.findMany({
      where: {
        class: { teacherId: teacher.id },
        lessonDate: { gte: startToday, lt: weekEnd },
      },
      include: { class: true },
      orderBy: [{ lessonDate: "asc" }, { startTime: "asc" }],
      take: 8,
    }),
    prisma.report.findMany({
      where: { teacherId: teacher.id, reportMonth: month },
    }),
    prisma.lessonSession.findMany({
      where: {
        class: { teacherId: teacher.id },
        lessonDate: { lt: startToday },
        status: "PLANNED",
      },
      include: { class: true },
      orderBy: { lessonDate: "asc" },
      take: 6,
    }),
    prisma.class.findMany({
      where: { teacherId: teacher.id, setupStatus: { not: "COMPLETE" } },
      include: { students: true, schedules: true, tuition: true },
      orderBy: { updatedAt: "desc" },
      take: 4,
    }),
  ]);

  const expected = reports.reduce((sum, report) => sum + report.totalAmount, 0);
  const paid = reports.reduce((sum, report) => sum + report.paidAmount, 0);
  const remaining = expected - paid;
  const nextAction = setupClasses[0]
    ? {
        href: setupClasses[0].students.length
          ? setupClasses[0].schedules.length
            ? `/classes/${setupClasses[0].id}/tuition`
            : `/classes/${setupClasses[0].id}/schedule`
          : `/classes/${setupClasses[0].id}/students`,
        label: `Hoàn tất setup ${setupClasses[0].name}`,
        detail: setupClasses[0].students.length
          ? setupClasses[0].schedules.length
            ? "Còn cấu hình học phí"
            : "Còn thêm lịch học"
          : "Còn thêm học sinh",
      }
    : staleLessons.length
      ? {
          href: "/lessons",
          label: "Ghi nhận buổi đã qua",
          detail: `${staleLessons.length} buổi đang chờ cập nhật`,
        }
      : {
          href: "/reports",
          label: "Xem báo cáo học phí",
          detail: "Kiểm tra tổng thu và link gửi phụ huynh",
        };

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description="Nhìn nhanh hôm nay, việc cần xử lý và học phí tháng hiện tại."
        action={
          <Link href="/classes/new" className="btn btn-primary">
            <CalendarPlus size={18} />
            Tạo lớp
          </Link>
        }
      />
      <section className="card mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--muted)]">
              Việc nên làm tiếp theo
            </p>
            <h2 className="mt-1 text-xl font-black">{nextAction.label}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {nextAction.detail}
            </p>
          </div>
          <Link href={nextAction.href} className="btn btn-secondary">
            Mở ngay
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
      <section className="grid-3 mb-6">
        <Link href="/classes" className="card metric-card p-4">
          <GraduationSummary
            label="Lớp đang học"
            value={classCount.toString()}
          />
        </Link>
        <Link href="/classes" className="card metric-card p-4">
          <GraduationSummary
            label="Học sinh đang học"
            value={studentCount.toString()}
          />
        </Link>
        <Link href="/reports" className="card metric-card p-4">
          <GraduationSummary
            label="Chưa thu tháng này"
            value={formatMoney(remaining)}
            tone={remaining > 0 ? "warn" : "ok"}
          />
        </Link>
      </section>
      <section className="grid-2">
        <div className="card p-4">
          <div className="section-heading">
            <h2>Hôm nay</h2>
            <CalendarPlus size={18} />
          </div>
          <div className="space-y-3">
            {todayLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-md border border-[var(--line)] p-3"
              >
                <div className="font-bold">
                  {lesson.startTime} - {lesson.class.name}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge value={lesson.status} />
                  {lesson.status === "PLANNED" ? (
                    <LessonQuickAction
                      lessonId={lesson.id}
                      status="COMPLETED"
                      variant="secondary"
                    />
                  ) : null}
                </div>
              </div>
            ))}
            {!todayLessons.length ? (
              <p className="text-sm text-[var(--muted)]">
                Chưa có buổi học nào hôm nay.
              </p>
            ) : null}
          </div>
        </div>
        <div className="card p-4">
          <div className="section-heading">
            <h2>Cần ghi nhận</h2>
            <CircleAlert size={18} />
          </div>
          <div className="space-y-3">
            {staleLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="rounded-md border border-[var(--line)] p-3"
              >
                <div className="font-bold">{lesson.class.name}</div>
                <p className="text-sm text-[var(--muted)]">
                  {formatDate(lesson.lessonDate)} lúc {lesson.startTime}
                </p>
                <div className="mt-2">
                  <LessonQuickAction
                    lessonId={lesson.id}
                    status="COMPLETED"
                    variant="primary"
                  />
                </div>
              </div>
            ))}
            {!staleLessons.length ? (
              <p className="text-sm text-[var(--muted)]">
                Không có buổi quá hạn.
              </p>
            ) : null}
          </div>
        </div>
      </section>
      {setupClasses.length ? (
        <section className="card mt-6 p-4">
          <div className="section-heading">
            <h2>Lớp đang setup</h2>
            <CheckCircle2 size={18} />
          </div>
          <div className="compact-list">
            {setupClasses.map((item) => (
              <Link
                key={item.id}
                href={`/classes/${item.id}`}
                className="compact-row"
              >
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.students.length} học sinh - {item.schedules.length}{" "}
                    lịch - {item.tuition ? "đã có học phí" : "chưa có học phí"}
                  </small>
                </span>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
      <section className="card mt-6 p-4">
        <div className="section-heading">
          <h2>Sắp tới trong 7 ngày</h2>
          <FileText size={18} />
        </div>
        <table className="table">
          <tbody>
            {upcomingLessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{formatDate(lesson.lessonDate)}</td>
                <td>
                  {lesson.startTime} - {lesson.endTime}
                </td>
                <td>
                  <Link
                    className="font-bold"
                    href={`/classes/${lesson.classId}`}
                  >
                    {lesson.class.name}
                  </Link>
                </td>
                <td>
                  <StatusBadge value={lesson.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function GraduationSummary({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn" | "ok";
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        {tone === "warn" ? (
          <WalletCards size={18} className="text-[var(--warn)]" />
        ) : null}
        {tone === "ok" ? (
          <CheckCircle2 size={18} className="text-[var(--accent)]" />
        ) : null}
      </div>
      <strong className="mt-2 block text-3xl">{value}</strong>
    </>
  );
}

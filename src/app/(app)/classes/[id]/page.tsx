import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { generateLessonsForMonth, updateClassStatus } from "@/lib/actions";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonthKey, formatDate, formatMoney } from "@/lib/format";
import { ArrowRight, CalendarDays, FileText, UserPlus, WalletCards } from "lucide-react";

const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const klass = await prisma.class.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      students: { include: { parents: true }, orderBy: { createdAt: "asc" } },
      schedules: { orderBy: { dayOfWeek: "asc" } },
      tuition: true,
      lessons: { orderBy: [{ lessonDate: "desc" }, { startTime: "asc" }], take: 20 },
      reports: { orderBy: { createdAt: "desc" }, take: 12 }
    }
  });
  if (!klass) notFound();

  const hasStudents = klass.students.length > 0;
  const hasSchedule = klass.schedules.length > 0;
  const hasTuition = Boolean(klass.tuition);
  const setupSteps = [
    { label: "Thêm học sinh", done: hasStudents, href: `/classes/${klass.id}/students`, detail: `${klass.students.length} học sinh` },
    { label: "Thêm lịch học", done: hasSchedule, href: `/classes/${klass.id}/schedule`, detail: `${klass.schedules.length} lịch cố định` },
    { label: "Cấu hình học phí", done: hasTuition, href: `/classes/${klass.id}/tuition`, detail: hasTuition ? formatMoney(klass.tuition?.feePerLesson ?? klass.tuition?.fixedMonthlyFee ?? 0) : "Chưa có học phí" }
  ];
  const nextSetupStep = setupSteps.find((step) => !step.done);

  return (
    <>
      <PageHeader
        title={klass.name}
        description={`${klass.subject} - ${klass.description ?? "Chưa có mô tả"}`}
        action={
          nextSetupStep ? (
            <Link href={nextSetupStep.href} className="btn btn-primary">
              {nextSetupStep.label}
              <ArrowRight size={18} />
            </Link>
          ) : (
            <Link href={`/classes/${klass.id}/reports/new`} className="btn btn-primary">
              Chốt báo cáo
              <FileText size={18} />
            </Link>
          )
        }
      />
      <section className="grid-3 mb-6">
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Trạng thái</p><StatusBadge value={klass.status} /></div>
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Học sinh</p><strong className="text-3xl">{klass.students.length}</strong></div>
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Học phí</p><strong>{klass.tuition?.type ?? "Chưa cấu hình"}</strong><p>{formatMoney(klass.tuition?.feePerLesson ?? klass.tuition?.fixedMonthlyFee ?? 0)}</p></div>
      </section>
      <section className="grid-2 mb-6">
        <Link href={`/classes/${klass.id}/students`} className="card metric-card p-4">
          <div className="section-heading">
            <h2>Học sinh</h2>
            <UserPlus size={18} />
          </div>
          <strong className="text-3xl">{klass.students.length}</strong>
          <p className="mt-2 text-sm text-[var(--muted)]">Mở trang riêng để thêm học sinh và phụ huynh.</p>
        </Link>
        <Link href={`/classes/${klass.id}/schedule`} className="card metric-card p-4">
          <div className="section-heading">
            <h2>Lịch học cố định</h2>
            <CalendarDays size={18} />
          </div>
          <strong className="text-3xl">{klass.schedules.length}</strong>
          <p className="mt-2 text-sm text-[var(--muted)]">{klass.schedules.map((schedule) => `${weekdays[schedule.dayOfWeek]} ${schedule.startTime}`).join(", ") || "Chưa có lịch học."}</p>
        </Link>
      </section>
      <section className="card mt-6 p-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-black">Buổi học gần đây</h2>
          <form action={generateLessonsForMonth} className="flex gap-2">
            <input name="classId" type="hidden" value={klass.id} />
            <input className="rounded-md border border-[var(--line)] px-3" name="month" type="month" defaultValue={currentMonthKey()} />
            <button className="btn btn-secondary" type="submit">Sinh lịch tháng</button>
          </form>
        </div>
        <table className="table">
          <tbody>
            {klass.lessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{formatDate(lesson.lessonDate)}</td><td>{lesson.startTime} - {lesson.endTime}</td><td><StatusBadge value={lesson.status} /></td><td>{lesson.isBillable ? formatMoney(lesson.billableAmount) : "Không tính phí"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="grid-2 mt-6">
        <Link href={`/classes/${klass.id}/tuition`} className="card metric-card p-4">
          <div className="section-heading">
            <h2>Học phí</h2>
            <WalletCards size={18} />
          </div>
          <strong>{klass.tuition?.type ?? "Chưa cấu hình"}</strong>
          <p className="mt-2 text-sm text-[var(--muted)]">Mở trang riêng để chọn cách tính phí.</p>
        </Link>
        <Link href={`/classes/${klass.id}/reports/new`} className="card metric-card p-4">
          <div className="section-heading">
            <h2>Chốt báo cáo tháng</h2>
            <FileText size={18} />
          </div>
          <strong>{klass.reports.length} báo cáo</strong>
          <p className="mt-2 text-sm text-[var(--muted)]">Tạo báo cáo học phí và link gửi phụ huynh.</p>
        </Link>
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-black">Báo cáo gần đây</h2>
          <div className="space-y-2">
            {klass.reports.map((report) => (
              <a key={report.id} className="block rounded-md border border-[var(--line)] p-3" href={`/reports/${report.id}`}>
                <strong>{report.reportMonth}</strong> - {formatMoney(report.totalAmount)}
              </a>
            ))}
          </div>
        </div>
      </section>
      <form action={updateClassStatus} className="mt-6 flex gap-2">
        <input name="classId" type="hidden" value={klass.id} />
        <select className="rounded-md border border-[var(--line)] px-3" name="status" defaultValue={klass.status}>
          <option value="ACTIVE">Đang học</option><option value="PAUSED">Tạm dừng</option><option value="ENDED">Đã kết thúc</option>
        </select>
        <button className="btn btn-secondary" type="submit">Cập nhật trạng thái</button>
      </form>
    </>
  );
}

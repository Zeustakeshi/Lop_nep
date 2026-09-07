import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ScheduleCalendarPicker } from "@/components/schedule-calendar-picker";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const weekdays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

export default async function ClassSchedulePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const [klass, allSchedules] = await Promise.all([
    prisma.class.findFirst({
      where: { id, teacherId: teacher.id },
      include: { schedules: { orderBy: { dayOfWeek: "asc" } } }
    }),
    prisma.classSchedule.findMany({
      where: { class: { teacherId: teacher.id, status: "ACTIVE" }, status: "ACTIVE" },
      include: { class: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }]
    })
  ]);
  if (!klass) notFound();

  return (
    <>
      <PageHeader
        title="Thêm lịch học"
        description={klass.name}
        action={
          <Link href={`/classes/${klass.id}`} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Tổng quan lớp
          </Link>
        }
      />
      <section className="card mb-6 p-4">
        <div className="section-heading">
          <h2>Lịch đang có</h2>
          <CalendarDays size={18} />
        </div>
        <div className="compact-list">
          {klass.schedules.map((schedule) => (
            <div key={schedule.id} className="compact-row">
              <span>
                <strong>{weekdays[schedule.dayOfWeek]} {schedule.startTime} - {schedule.endTime}</strong>
                <small>{schedule.learningMode ?? "offline"} - {schedule.location ?? "Chưa có địa điểm"}</small>
              </span>
            </div>
          ))}
          {!klass.schedules.length ? <p className="text-sm text-[var(--muted)]">Chưa có lịch học cố định.</p> : null}
        </div>
      </section>
      <ScheduleCalendarPicker
        classId={klass.id}
        schedules={allSchedules.map((schedule) => ({
          id: schedule.id,
          classId: schedule.classId,
          className: schedule.class.name,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          location: schedule.location,
          learningMode: schedule.learningMode,
          isCurrentClass: schedule.classId === klass.id
        }))}
      />
      <section className="mt-6 flex flex-wrap gap-2">
        <Link href={`/classes/${klass.id}/students`} className="btn btn-secondary">
          <ArrowLeft size={18} />
          Quay lại học sinh
        </Link>
        <Link href={`/classes/${klass.id}/tuition`} className="btn btn-secondary">
          Sang học phí
          <ArrowRight size={18} />
        </Link>
      </section>
    </>
  );
}

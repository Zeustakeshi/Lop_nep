import { PageHeader } from "@/components/page-header";
import { createLesson } from "@/lib/actions";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CheckCircle2, Plus } from "lucide-react";
import { LessonForm } from "@/components/lesson-form";
import { SubmitButton } from "@/components/submit-button";

export default async function LessonsPage() {
  const teacher = await requireTeacher();
  const classes = await prisma.class.findMany({
    where: { teacherId: teacher.id, status: "ACTIVE" },
    orderBy: { name: "asc" },
  });
  const lessons = await prisma.lessonSession.findMany({
    where: { class: { teacherId: teacher.id } },
    include: { class: { include: { tuition: true } } },
    orderBy: [{ lessonDate: "desc" }, { startTime: "asc" }],
    take: 40,
  });

  return (
    <>
      <PageHeader
        title="Buổi học"
        description="Cập nhật nhanh trạng thái trước; ghi chú chi tiết chỉ mở khi cần."
      />
      <section className="card mb-6 p-4">
        <div className="section-heading">
          <h2>Tạo nhanh buổi học</h2>
          <Plus size={18} />
        </div>
        <form action={createLesson} className="grid-3">
          <div className="field">
            <label>Lớp</label>
            <select name="classId">
              {classes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Ngày</label>
            <input name="lessonDate" type="date" required />
          </div>
          <div className="field">
            <label>Trạng thái</label>
            <select name="status">
              <option value="COMPLETED">Đã dạy</option>
              <option value="PLANNED">Chưa ghi nhận</option>
              <option value="STUDENT_ABSENT">Học sinh nghỉ</option>
              <option value="TEACHER_ABSENT">Giáo viên nghỉ</option>
              <option value="CANCELLED">Hủy buổi</option>
              <option value="MAKEUP">Dạy bù</option>
              <option value="TRIAL">Học thử</option>
            </select>
          </div>
          <div className="field">
            <label>Bắt đầu</label>
            <input name="startTime" type="time" required />
          </div>
          <div className="field">
            <label>Kết thúc</label>
            <input name="endTime" type="time" required />
          </div>
          <div className="field">
            <label>Số tiền</label>
            <input name="billableAmount" inputMode="numeric" />
          </div>
          <SubmitButton className="self-end" pendingText="Đang lưu...">
            Lưu
            <CheckCircle2 size={18} />
          </SubmitButton>
        </form>
      </section>
      <section className="grid gap-4">
        {lessons.map((lesson) => (
          <LessonForm key={lesson.id} lesson={lesson} />
        ))}
      </section>
    </>
  );
}

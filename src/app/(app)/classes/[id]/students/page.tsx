import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { addParentContact, createClassStudent, createClassStudentsBulk, updateClassStudentStatus } from "@/lib/actions";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ClassStudentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const klass = await prisma.class.findFirst({
    where: { id, teacherId: teacher.id },
    include: { students: { include: { parents: true }, orderBy: { createdAt: "asc" } } }
  });
  if (!klass) notFound();

  return (
    <>
      <PageHeader
        title="Thêm học sinh"
        description={klass.name}
        action={
          <Link href={`/classes/${klass.id}`} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Tổng quan lớp
          </Link>
        }
      />
      <section className="grid-2">
        <div className="card p-4">
          <div className="section-heading">
            <h2>Danh sách học sinh</h2>
            <UserPlus size={18} />
          </div>
          <div className="space-y-3">
            {klass.students.map((student) => (
              <div key={student.id} className="rounded-md border border-[var(--line)] p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold">{student.fullName}</div>
                    <p className="text-sm text-[var(--muted)]">{student.schoolLevel ?? "Chưa có khối lớp"}</p>
                  </div>
                  <form action={updateClassStudentStatus} className="flex gap-2">
                    <input name="classStudentId" type="hidden" value={student.id} />
                    <select className="rounded-md border border-[var(--line)] px-2 py-1 text-sm" name="status" defaultValue={student.status}>
                      <option value="ACTIVE">Đang học</option>
                      <option value="PAUSED">Tạm nghỉ</option>
                      <option value="LEFT">Đã nghỉ</option>
                    </select>
                    <button className="btn btn-secondary" type="submit">Lưu</button>
                  </form>
                </div>
                <p className="mt-2 text-sm">{student.parents.map((p) => `${p.fullName} ${p.phone ?? ""}`).join(", ") || "Chưa có phụ huynh"}</p>
                <details className="optional-panel mt-3">
                  <summary>Thêm phụ huynh</summary>
                  <form action={addParentContact} className="mt-3 grid gap-2">
                    <input name="classStudentId" type="hidden" value={student.id} />
                    <div className="grid-2">
                      <input className="rounded-md border border-[var(--line)] px-2 py-1" name="fullName" placeholder="Tên phụ huynh" />
                      <input className="rounded-md border border-[var(--line)] px-2 py-1" name="phone" placeholder="Số điện thoại" />
                    </div>
                    <button className="btn btn-secondary w-fit" type="submit">Lưu phụ huynh</button>
                  </form>
                </details>
              </div>
            ))}
            {!klass.students.length ? <p className="text-sm text-[var(--muted)]">Chưa có học sinh trong lớp.</p> : null}
          </div>
        </div>
        <div className="grid gap-4">
        <form action={createClassStudentsBulk} className="card grid gap-3 p-4">
          <h2 className="text-lg font-black">Thêm nhanh học sinh</h2>
          <input name="classId" type="hidden" value={klass.id} />
          <div className="field">
            <label>Mỗi học sinh một dòng</label>
            <textarea name="students" required rows={6} placeholder={"Nguyễn Minh Anh | Lớp 9 | 0901234567\nTrần Gia Huy | Lớp 9"} />
          </div>
          <button className="btn btn-primary w-fit" type="submit">Thêm danh sách</button>
        </form>
        <details className="card p-4">
          <summary className="font-black">Thêm đầy đủ một học sinh</summary>
        <form action={createClassStudent} className="mt-4 grid gap-3">
          <h2 className="text-lg font-black">Thông tin chi tiết</h2>
          <input name="classId" type="hidden" value={klass.id} />
          <div className="field"><label>Họ tên</label><input name="fullName" required placeholder="Ví dụ: Nguyễn Minh Anh" /></div>
          <div className="field"><label>Khối lớp</label><input name="schoolLevel" placeholder="Lớp 9" /></div>
          <details className="optional-panel">
            <summary>Thông tin phụ của học sinh</summary>
            <div className="mt-3 grid gap-3">
              <div className="field"><label>Biệt danh</label><input name="nickname" /></div>
              <div className="field"><label>Ngày sinh</label><input name="birthDate" type="date" /></div>
              <div className="field"><label>Ngày vào lớp</label><input name="joinedAt" type="date" /></div>
              <div className="field"><label>Ghi chú</label><textarea name="note" /></div>
            </div>
          </details>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" type="submit">Lưu học sinh</button>
            <Link href={`/classes/${klass.id}/schedule`} className="btn btn-secondary">
              Sang lịch học
              <ArrowRight size={18} />
            </Link>
          </div>
        </form>
        </details>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { createReport } from "@/lib/actions";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonthKey } from "@/lib/format";

export default async function NewClassReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const klass = await prisma.class.findFirst({
    where: { id, teacherId: teacher.id },
    include: { students: { where: { status: "ACTIVE" }, orderBy: { fullName: "asc" } } }
  });
  if (!klass) notFound();

  return (
    <>
      <PageHeader
        title="Chốt báo cáo tháng"
        description={klass.name}
        action={
          <Link href={`/classes/${klass.id}`} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Tổng quan lớp
          </Link>
        }
      />
      <form action={createReport} className="card grid gap-3 p-4">
        <div className="section-heading">
          <h2>Thông tin báo cáo</h2>
          <FileText size={18} />
        </div>
        <input name="classId" type="hidden" value={klass.id} />
        <div className="field">
          <label>Phạm vi báo cáo</label>
          <select name="classStudentId" required defaultValue="__CLASS__">
            <option value="__CLASS__">Cả lớp</option>
            {klass.students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
          </select>
        </div>
        <div className="field"><label>Tháng</label><input name="month" type="month" defaultValue={currentMonthKey()} required /></div>
        <details className="optional-panel">
          <summary>Giảm trừ, phụ phí và ghi chú</summary>
          <div className="mt-3 grid gap-3">
            <div className="grid-2">
              <div className="field"><label>Giảm trừ</label><input name="discountAmount" inputMode="numeric" /></div>
              <div className="field"><label>Phụ phí</label><input name="surchargeAmount" inputMode="numeric" /></div>
            </div>
            <div className="field"><label>Ghi chú thanh toán</label><textarea name="paymentNote" defaultValue={teacher.defaultPaymentNote ?? ""} /></div>
          </div>
        </details>
        <SubmitButton className="w-fit" pendingText="Đang tạo...">
          Tạo báo cáo
        </SubmitButton>
      </form>
    </>
  );
}

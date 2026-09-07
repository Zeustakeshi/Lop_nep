import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { MarkPaidButton } from "@/components/mark-paid-button";
import { ReportForm } from "@/components/report-form";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonthKey, formatMoney } from "@/lib/format";

export default async function ReportsPage() {
  const teacher = await requireTeacher();
  const [classes, reports] = await Promise.all([
    prisma.class.findMany({
      where: { teacherId: teacher.id, status: "ACTIVE" },
      include: { students: { where: { status: "ACTIVE" }, orderBy: { fullName: "asc" } } },
      orderBy: { name: "asc" }
    }),
    prisma.report.findMany({ where: { teacherId: teacher.id }, include: { class: true, classStudent: true }, orderBy: { createdAt: "desc" } })
  ]);

  return (
    <>
      <PageHeader title="Học phí" description="Chốt báo cáo, gửi phụ huynh và ghi nhận thanh toán tại một nơi." />
      <ReportForm>
        <div className="grid-3">
          <div className="field">
            <label>Học sinh</label>
            <select name="classStudentSelection" required defaultValue="">
              <option value="" disabled>Chọn học sinh và lớp</option>
              {classes.flatMap((item) => [
                <option key={`${item.id}-class`} value={`${item.id}:__CLASS__`}>Cả lớp · {item.name}</option>,
                ...item.students.map((student) => (
                  <option key={student.id} value={`${item.id}:${student.id}`}>{student.fullName} · {item.name}</option>
                ))
              ])}
            </select>
          </div>
          <div className="field"><label>Tháng</label><input name="month" type="month" defaultValue={currentMonthKey()} required /></div>
          <div className="field"><label>Hạn thanh toán</label><input name="paymentDueDate" type="date" /></div>
          <div className="field"><label>Giảm trừ</label><input name="discountAmount" inputMode="numeric" /></div>
          <div className="field"><label>Phụ phí</label><input name="surchargeAmount" inputMode="numeric" /></div>
        </div>
      </ReportForm>
      <section className="card p-4">
        <table className="table">
          <thead><tr><th>Tháng</th><th>Lớp</th><th>Tổng tiền</th><th>Còn lại</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td><Link className="font-black text-[var(--accent-strong)]" href={`/reports/${report.id}`}>{report.reportMonth}</Link></td>
                <td>{report.classStudent?.fullName ? `${report.classStudent.fullName} · ` : ""}{report.class.name}</td>
                <td>{formatMoney(report.totalAmount)}</td>
                <td>{formatMoney(report.remainingAmount)}</td>
                <td><StatusBadge value={report.paymentStatus} /></td>
                <td>{report.remainingAmount > 0 ? <MarkPaidButton reportId={report.id} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

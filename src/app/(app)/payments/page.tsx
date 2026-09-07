import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { MarkPaidButton } from "@/components/mark-paid-button";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";

export default async function PaymentsPage() {
  const teacher = await requireTeacher();
  const reports = await prisma.report.findMany({
    where: { teacherId: teacher.id },
    include: { class: true },
    orderBy: [{ reportMonth: "desc" }, { createdAt: "desc" }]
  });

  const total = reports.reduce((sum, report) => sum + report.totalAmount, 0);
  const paid = reports.reduce((sum, report) => sum + report.paidAmount, 0);

  return (
    <>
      <PageHeader title="Thanh toán" description="Theo dõi đã thu, chưa thu và các báo cáo quá hạn." />
      <section className="grid-3 mb-6">
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Tổng cần thu</p><strong className="text-2xl">{formatMoney(total)}</strong></div>
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Đã thu</p><strong className="text-2xl">{formatMoney(paid)}</strong></div>
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Còn lại</p><strong className="text-2xl">{formatMoney(total - paid)}</strong></div>
      </section>
      <section className="card p-4">
        <table className="table">
          <thead><tr><th>Báo cáo</th><th>Lớp</th><th>Tổng tiền</th><th>Đã thu</th><th>Còn lại</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            {reports.map((report) => (
              <tr key={report.id}>
                <td><Link className="font-black text-[var(--accent-strong)]" href={`/reports/${report.id}`}>{report.reportMonth}</Link></td>
                <td>{report.class.name}</td>
                <td>{formatMoney(report.totalAmount)}</td>
                <td>{formatMoney(report.paidAmount)}</td>
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

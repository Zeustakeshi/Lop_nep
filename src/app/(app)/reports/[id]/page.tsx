import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { ToggleLinkForm, RotateTokenForm, QuickPaidForm, PaymentForm } from "@/components/report-detail-actions";
import { ReportRecalculateButton } from "@/components/report-recalculate-button";
import { requireTeacher } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { isLearnedLessonStatus } from "@/lib/tuition";

type ReportSnapshot = {
  teacher?: {
    name?: string;
    phone?: string | null;
    email?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    paymentQrUrl?: string | null;
  };
  class?: { name?: string; subject?: string };
  students?: Array<{ id: string; fullName: string; nickname?: string | null }>;
  lessons?: Array<{
    id: string;
    lessonDate: string;
    startTime: string;
    endTime: string;
    status: string;
    taughtContent?: string | null;
    homework?: string | null;
    parentNote?: string | null;
    isBillable: boolean;
    billableAmount: number;
  }>;
};

export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireTeacher();
  const report = await prisma.report.findFirst({
    where: { id, teacherId: teacher.id },
    include: { class: true, payments: { orderBy: { paidAt: "desc" } } }
  });
  if (!report) notFound();

  const snapshot = report.snapshot as ReportSnapshot;
  const displayedLessons = (snapshot.lessons ?? []).map((lesson) => ({
    ...lesson,
    isBillable: isLearnedLessonStatus(lesson.status) && lesson.isBillable,
    billableAmount: isLearnedLessonStatus(lesson.status) ? lesson.billableAmount : 0
  }));
  const publicUrl = `/report/${report.shareToken}`;

  return (
    <>
      <PageHeader title={`Báo cáo ${report.reportMonth}`} description={`${snapshot.students?.length === 1 ? `${snapshot.students[0].fullName} · ` : ""}${report.class.name} - ${formatMoney(report.totalAmount)}`} />
      <section className="grid-3 mb-6">
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Tổng cần thu</p><strong className="text-2xl">{formatMoney(report.totalAmount)}</strong></div>
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Đã thu</p><strong className="text-2xl">{formatMoney(report.paidAmount)}</strong></div>
        <div className="card p-4"><p className="text-sm text-[var(--muted)]">Còn lại</p><strong className="text-2xl">{formatMoney(report.remainingAmount)}</strong></div>
      </section>
      <section className="card mb-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Link phụ huynh</h2>
            <p className="break-all text-sm text-[var(--muted)]">{publicUrl}</p>
          </div>
          <StatusBadge value={report.isShareEnabled ? "SENT" : "CANCELLED"} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <a className="btn btn-primary" href={publicUrl} target="_blank">Xem link</a>
          <PrintButton label="In PDF" />
          <ToggleLinkForm reportId={report.id} isEnabled={report.isShareEnabled} />
          <RotateTokenForm reportId={report.id} />
        </div>
      </section>
      <section className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">Danh sách buổi học</h2>
          <ReportRecalculateButton reportId={report.id} />
        </div>
        <table className="table">
          <thead><tr><th>Ngày</th><th>Giờ</th><th>Trạng thái</th><th>Nội dung</th><th>Phí</th></tr></thead>
          <tbody>
            {displayedLessons.map((lesson) => (
              <tr key={lesson.id}>
                <td>{formatDate(lesson.lessonDate)}</td>
                <td>{lesson.startTime} - {lesson.endTime}</td>
                <td><StatusBadge value={lesson.status} /></td>
                <td>{lesson.taughtContent ?? ""}<p className="text-sm text-[var(--muted)]">{lesson.parentNote ?? ""}</p></td>
                <td>{lesson.isBillable ? formatMoney(lesson.billableAmount) : "Không tính"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="grid-2">
        {report.remainingAmount > 0 ? (
          <QuickPaidForm reportId={report.id} remaining={report.remainingAmount} />
        ) : null}
        <PaymentForm reportId={report.id} />
        <div className="card p-4">
          <h2 className="mb-3 text-lg font-black">Lịch sử thu tiền</h2>
          <div className="space-y-2">
            {report.payments.map((payment) => (
              <div key={payment.id} className="rounded-md border border-[var(--line)] p-3">
                <strong>{formatMoney(payment.amount)}</strong>
                <p className="text-sm text-[var(--muted)]">{formatDate(payment.paidAt)} - {payment.method ?? "Khác"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

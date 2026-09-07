import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { StatusBadge } from "@/components/status-badge";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney } from "@/lib/format";
import { isLearnedLessonStatus } from "@/lib/tuition";
import { VIETNAMESE_BANKS, generateVietQRUrl } from "@/lib/banks";

export const dynamic = "force-dynamic";

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

function formatReportMonth(value: string) {
  const [year, month] = value.split("-");
  return month && year ? `Tháng ${month} / ${year}` : value;
}

function getBankShortName(bankCode: string): string {
  const bank = VIETNAMESE_BANKS.find(
    (b) => b.code === bankCode || b.name === bankCode,
  );
  return bank?.shortName || bankCode || "Ngân hàng";
}

function formatAccountNumber(num: string): string {
  const cleaned = num.replace(/\s/g, "");
  if (cleaned.length <= 4) return cleaned;
  return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
}

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await prisma.report.findUnique({
    where: { shareToken: token },
  });

  if (
    !report ||
    !report.isShareEnabled ||
    (report.shareExpiresAt && report.shareExpiresAt < new Date())
  ) {
    notFound();
  }

  // Fetch current teacher info for up-to-date bank details
  const teacher = await prisma.teacher.findUnique({
    where: { id: report.teacherId },
    select: {
      name: true,
      phone: true,
      email: true,
      bankName: true,
      bankAccountName: true,
      bankAccountNumber: true,
      paymentQrUrl: true,
    },
  });

  if (!report.viewedAt) {
    await prisma.report.update({
      where: { id: report.id },
      data: {
        viewedAt: new Date(),
        status: "VIEWED",
        paymentStatus:
          report.paymentStatus === "UNPAID" ? "VIEWED" : report.paymentStatus,
      },
    });
  }

  const snapshot = report.snapshot as ReportSnapshot;

  // Merge snapshot teacher info with current teacher info (prefer current for bank details)
  const currentTeacherInfo = {
    name: teacher?.name ?? snapshot.teacher?.name,
    phone: teacher?.phone ?? snapshot.teacher?.phone,
    email: teacher?.email ?? snapshot.teacher?.email,
    bankName: teacher?.bankName ?? snapshot.teacher?.bankName,
    bankAccountName: teacher?.bankAccountName ?? snapshot.teacher?.bankAccountName,
    bankAccountNumber: teacher?.bankAccountNumber ?? snapshot.teacher?.bankAccountNumber,
    paymentQrUrl: teacher?.paymentQrUrl ?? snapshot.teacher?.paymentQrUrl,
  };
  const displayedLessons = (snapshot.lessons ?? []).map((lesson) => ({
    ...lesson,
    isBillable: isLearnedLessonStatus(lesson.status) && lesson.isBillable,
    billableAmount: isLearnedLessonStatus(lesson.status)
      ? lesson.billableAmount
      : 0,
  }));
  const learnedLessons = displayedLessons.filter((lesson) =>
    isLearnedLessonStatus(lesson.status),
  );
  const billableLessons = learnedLessons.filter((lesson) => lesson.isBillable);
  const studentNames =
    snapshot.students?.map((student) => student.fullName).join(", ") ||
    "Học viên";
  const teacherContact = currentTeacherInfo.phone ?? currentTeacherInfo.email;

  // Check if bank info is complete
  const hasBankInfo = !!(
    currentTeacherInfo.bankName &&
    currentTeacherInfo.bankAccountNumber &&
    currentTeacherInfo.bankAccountName
  );

  // Generate QR URL if we have bank info
  let qrUrl: string | null = null;
  if (hasBankInfo) {
    const bankCode = currentTeacherInfo.bankName!;
    // Check if it's a bank code or bank name
    const bank = VIETNAMESE_BANKS.find(
      (b) => b.code === bankCode || b.name === bankCode,
    );
    const finalBankCode = bank?.code || bankCode;

    qrUrl = generateVietQRUrl({
      bankCode: finalBankCode,
      accountNumber: currentTeacherInfo.bankAccountNumber!,
      accountName: currentTeacherInfo.bankAccountName!,
      amount: report.totalAmount,
      description: report.paymentNote || `${studentNames} - Thanh toán học phí`,
    });
  }

  return (
    <main className="report-page container max-w-4xl py-6">
      <div className="report-toolbar no-print">
        <p>Phiếu học phí đã sẵn sàng để lưu hoặc in khổ A4</p>
        <PrintButton />
      </div>

      <article className="report-sheet">
        {/* Header */}
        <header className="report-header">
          <div className="report-brand">
            <span className="report-brand-mark">MM</span>
            <div>
              <strong>MENTOR MONEY</strong>
              <span>Báo cáo học tập &amp; học phí</span>
            </div>
          </div>
          <div className="report-document-meta">
            <span>Kỳ báo cáo</span>
            <strong>{formatReportMonth(report.reportMonth)}</strong>
          </div>
        </header>

        {/* Title Section */}
        <section className="report-title-section">
          <div className="report-title-left">
            <p className="report-eyebrow">Báo cáo học phí</p>
            <h1>{formatReportMonth(report.reportMonth)}</h1>
            <p className="report-class-name">
              {snapshot.class?.name} <span>•</span> {snapshot.class?.subject}
            </p>
          </div>
          <div className="report-title-right">
            <div className="report-info-card">
              <div className="report-info-row">
                <span className="report-info-label">Học viên</span>
                <span className="report-info-value">{studentNames}</span>
              </div>
              <div className="report-info-row">
                <span className="report-info-label">Giáo viên</span>
                <span className="report-info-value">
                  {currentTeacherInfo.name ?? "-"}
                </span>
              </div>
              {teacherContact && (
                <div className="report-info-row">
                  <span className="report-info-label">Liên hệ</span>
                  <span className="report-info-value">{teacherContact}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="report-summary" aria-label="Tổng quan học phí">
          <div className="report-stat">
            <span className="report-stat-label">Buổi đã học</span>
            <strong className="report-stat-value">
              {learnedLessons.length}
            </strong>
            <small className="report-stat-sub">buổi hoàn thành</small>
          </div>
          <div className="report-stat">
            <span className="report-stat-label">Buổi tính phí</span>
            <strong className="report-stat-value">
              {billableLessons.length}
            </strong>
            <small className="report-stat-sub">theo kỳ báo cáo</small>
          </div>
          <div className="report-stat report-stat-highlight">
            <span className="report-stat-label">Tổng thanh toán</span>
            <strong className="report-stat-value">
              {formatMoney(report.totalAmount)}
            </strong>
            <small className="report-stat-sub">Số tiền cần thanh toán</small>
          </div>
        </section>

        {/* Lessons Table */}
        <section className="report-section">
          <div className="report-section-header">
            <div>
              <span className="report-eyebrow">Chi tiết</span>
              <h2>Danh sách buổi học</h2>
            </div>
            <p className="report-section-count">
              {displayedLessons.length} buổi trong kỳ
            </p>
          </div>
          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th className="col-index">STT</th>
                  <th className="col-date">Ngày học</th>
                  <th className="col-time">Thời gian</th>
                  <th className="col-status">Trạng thái</th>
                  <th className="col-content">Nội dung buổi học</th>
                  <th className="col-fee">Học phí</th>
                </tr>
              </thead>
              <tbody>
                {displayedLessons.map((lesson, index) => (
                  <tr key={lesson.id}>
                    <td className="col-index" data-label="STT">
                      {String(index + 1).padStart(2, "0")}
                    </td>
                    <td className="col-date" data-label="Ngày học">
                      <strong>{formatDate(lesson.lessonDate)}</strong>
                    </td>
                    <td className="col-time" data-label="Thời gian">
                      {lesson.startTime} - {lesson.endTime}
                    </td>
                    <td className="col-status" data-label="Trạng thái">
                      <StatusBadge value={lesson.status} />
                    </td>
                    <td className="col-content" data-label="Nội dung">
                      {lesson.taughtContent ? (
                        <div>
                          <strong>{lesson.taughtContent}</strong>
                          {lesson.parentNote && (
                            <small className="report-note">
                              {lesson.parentNote}
                            </small>
                          )}
                        </div>
                      ) : (
                        <span className="report-empty">Chưa có nội dung</span>
                      )}
                    </td>
                    <td
                      className={`col-fee ${lesson.isBillable ? "" : "report-fee-muted"}`}
                      data-label="Học phí"
                    >
                      {lesson.isBillable
                        ? formatMoney(lesson.billableAmount)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Payment Section */}
        <section className="report-payment-section">
          <div className="report-payment-header">
            <span className="report-eyebrow">Thông tin thanh toán</span>
            <h2>Chuyển khoản ngân hàng</h2>
          </div>

          {hasBankInfo ? (
            <div className="report-payment-content">
              <div className="report-payment-details">
                <div className="report-bank-name">
                  <svg
                    className="report-bank-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
                  </svg>
                  <span>{getBankShortName(currentTeacherInfo.bankName!)}</span>
                </div>
                <div className="report-bank-info">
                  <div className="report-bank-row">
                    <span className="report-bank-label">Chủ tài khoản</span>
                    <span className="report-bank-value">
                      {currentTeacherInfo.bankAccountName}
                    </span>
                  </div>
                  <div className="report-bank-row">
                    <span className="report-bank-label">Số tài khoản</span>
                    <span className="report-bank-value report-account-number">
                      {formatAccountNumber(
                        currentTeacherInfo.bankAccountNumber!,
                      )}
                    </span>
                  </div>
                </div>
                {report.paymentNote && (
                  <div className="report-payment-note">
                    <span className="report-note-label">
                      Nội dung chuyển khoản
                    </span>
                    <span className="report-note-value">
                      {report.paymentNote}
                    </span>
                  </div>
                )}
              </div>

              <div className="report-payment-qr-section">
                {qrUrl && (
                  <div className="report-qr-wrapper">
                    <div className="report-qr-frame">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={qrUrl}
                        alt={`Mã QR thanh toán ${formatMoney(report.totalAmount)} qua ${getBankShortName(currentTeacherInfo.bankName!)}`}
                        className="report-qr-image"
                      />
                      <span className="report-qr-scan-line" aria-hidden="true" />
                    </div>
                    <span className="report-qr-label">
                      Quét mã QR để thanh toán
                    </span>
                  </div>
                )}
                <div className="report-amount-display">
                  <span className="report-amount-label">Số tiền</span>
                  <strong className="report-amount-value">
                    {formatMoney(report.totalAmount)}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="report-payment-contact">
              <div className="report-contact-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div className="report-contact-info">
                <h3>Vui lòng liên hệ giáo viên để thanh toán</h3>
                {currentTeacherInfo.phone && (
                  <p className="report-contact-phone">
                    <strong>{currentTeacherInfo.phone}</strong>
                  </p>
                )}
                <p className="report-contact-note">
                  Giáo viên chưa cập nhật thông tin chuyển khoản. Bạn vui lòng
                  liên hệ trực tiếp để nhận thông tin thanh toán.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Footer */}
        <footer className="report-footer">
          <p>Cảm ơn phụ huynh và học viên đã tin tưởng đồng hành.</p>
          <span>Báo cáo được tạo bởi Lớp Nếp</span>
        </footer>
      </article>
    </main>
  );
}

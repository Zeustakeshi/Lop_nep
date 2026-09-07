const labels: Record<string, string> = {
  ACTIVE: "Đang học",
  PAUSED: "Tạm dừng",
  ENDED: "Đã kết thúc",
  LEFT: "Đã nghỉ",
  PLANNED: "Chưa ghi nhận",
  COMPLETED: "Đã dạy",
  STUDENT_ABSENT: "Học sinh nghỉ",
  TEACHER_ABSENT: "Giáo viên nghỉ",
  CANCELLED: "Hủy buổi",
  MAKEUP: "Dạy bù",
  TRIAL: "Học thử",
  FINALIZED: "Đã chốt",
  DRAFT: "Đang setup",
  COMPLETE: "Đã hoàn tất",
  NEEDS_SCHEDULE: "Thiếu lịch",
  NEEDS_TUITION: "Thiếu học phí",
  SENT: "Đã gửi",
  VIEWED: "Đã xem",
  UNPAID: "Chưa thanh toán",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn"
};

export function StatusBadge({ value }: { value: string }) {
  return (
    <span className="status-badge" data-status={value}>
      {labels[value] ?? value}
    </span>
  );
}

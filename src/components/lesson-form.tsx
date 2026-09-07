"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateLesson } from "@/lib/actions";
import { ConfirmModal } from "@/components/confirm-modal";
import { formatMoney } from "@/lib/format";

interface Lesson {
  id: string;
  classId: string;
  lessonDate: Date;
  startTime: string;
  endTime: string;
  status: string;
  taughtContent: string | null;
  homework: string | null;
  internalNote: string | null;
  parentNote: string | null;
  isBillable: boolean;
  billableAmount: number;
  class: {
    name: string;
  };
}

interface LessonFormProps {
  lesson: Lesson;
}

export function LessonForm({ lesson }: LessonFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showBillableWarning, setShowBillableWarning] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (isPending) return;

    const formData = new FormData(e.currentTarget);

    // Check if billable is being set to "Không"
    const billableValue = formData.get("isBillable");
    if (billableValue === "" && lesson.isBillable) {
      setShowBillableWarning(true);
      return;
    }

    startTransition(async () => {
      await updateLesson(formData);
      router.refresh();
    });
  }

  function handleConfirmBillableChange() {
    if (isPending) return;

    const formData = new FormData();
    formData.set("lessonId", lesson.id);
    formData.set("status", lesson.status);
    formData.set("lessonDate", lesson.lessonDate.toISOString().split("T")[0]);
    formData.set("startTime", lesson.startTime);
    formData.set("endTime", lesson.endTime);
    formData.set("isBillable", "");
    formData.set("billableAmount", "0");

    setShowBillableWarning(false);
    startTransition(async () => {
      await updateLesson(formData);
      router.refresh();
    });
  }

  return (
    <>
      <form key={lesson.id} onSubmit={handleSubmit} className="card grid gap-3 p-4">
        <input name="lessonId" type="hidden" value={lesson.id} />
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-black">{lesson.class.name}</h2>
            <p className="text-sm text-[var(--muted)]">
              {lesson.lessonDate.toLocaleDateString("vi-VN")} {lesson.startTime} -{" "}
              {lesson.endTime}
            </p>
          </div>
          <span className="status-badge" data-status={lesson.status}>
            {lesson.status === "COMPLETED" && "Đã dạy"}
            {lesson.status === "PLANNED" && "Chưa ghi nhận"}
            {lesson.status === "STUDENT_ABSENT" && "Học sinh nghỉ"}
            {lesson.status === "TEACHER_ABSENT" && "Giáo viên nghỉ"}
            {lesson.status === "CANCELLED" && "Hủy buổi"}
            {lesson.status === "MAKEUP" && "Dạy bù"}
            {lesson.status === "TRIAL" && "Học thử"}
          </span>
        </div>
        <div className="grid-3">
          <div className="field">
            <label>Trạng thái</label>
            <select name="status" defaultValue={lesson.status}>
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
            <label>Tính phí</label>
            <select name="isBillable" defaultValue={lesson.isBillable ? "on" : ""}>
              <option value="">Không</option>
              <option value="on">Có</option>
            </select>
          </div>
          <div className="field">
            <label>Số tiền hiện tại: {formatMoney(lesson.billableAmount)}</label>
            <input
              name="billableAmount"
              inputMode="numeric"
              defaultValue={lesson.billableAmount || ""}
            />
          </div>
        </div>
        <details className="optional-panel">
          <summary>Nội dung bài học và ghi chú</summary>
          <div className="mt-3 grid-2">
            <div className="field">
              <label>Nội dung đã dạy</label>
              <textarea name="taughtContent" defaultValue={lesson.taughtContent ?? ""} />
            </div>
            <div className="field">
              <label>Bài tập về nhà</label>
              <textarea name="homework" defaultValue={lesson.homework ?? ""} />
            </div>
            <div className="field">
              <label>Ghi chú nội bộ</label>
              <textarea name="internalNote" defaultValue={lesson.internalNote ?? ""} />
            </div>
            <div className="field">
              <label>Ghi chú cho phụ huynh</label>
              <textarea name="parentNote" defaultValue={lesson.parentNote ?? ""} />
            </div>
          </div>
        </details>
        <button className="btn btn-secondary w-fit" type="submit" disabled={isPending}>
          {isPending ? "Đang lưu..." : "Cập nhật buổi học"}
        </button>
      </form>

      <ConfirmModal
        isOpen={showBillableWarning}
        onClose={() => setShowBillableWarning(false)}
        onConfirm={handleConfirmBillableChange}
        title="Xác nhận không tính phí"
        description={
          <div>
            <p>Bạn đang chuyển buổi học <strong>{lesson.class.name}</strong> sang <strong>không tính phí</strong>.</p>
            <p>Thông tin:</p>
            <ul>
              <li>Buổi học sẽ <strong>không xuất hiện</strong> trong báo cáo học phí</li>
              <li>Số tiền <strong>{formatMoney(lesson.billableAmount)}</strong> sẽ không được tính</li>
              <li>Phụ huynh sẽ không thấy buổi học này trong phiếu báo phí</li>
            </ul>
            <p>Bạn có chắc chắn muốn tiếp tục?</p>
          </div>
        }
        confirmText="Đồng ý, không tính phí"
        cancelText="Hủy, giữ nguyên"
        confirmVariant="danger"
        isPending={isPending}
      />
    </>
  );
}

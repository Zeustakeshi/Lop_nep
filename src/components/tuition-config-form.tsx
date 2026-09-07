"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateTuitionConfig } from "@/lib/actions";
import { formatMoney } from "@/lib/format";

function TuitionSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
      {pending ? "Đang lưu..." : "Lưu học phí"}
    </button>
  );
}

type Tuition = {
  type: string;
  feePerLesson: number | null;
  fixedMonthlyFee: number | null;
  packageLessons: number | null;
  packagePrice: number | null;
  effectiveFrom: Date | null;
} | null;

export function TuitionConfigForm({ classId, tuition, completedLessonsCount }: { classId: string; tuition: Tuition; completedLessonsCount: number }) {
  const [type, setType] = useState(tuition?.type ?? "ACTUAL_SESSIONS");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<{ formData: FormData; newAmount: number } | null>(null);
  const perLesson = type === "ACTUAL_SESSIONS" || type === "PER_SESSION" || type === "GROUP_BY_STUDENT";
  const monthly = type === "FIXED_MONTHLY";
  const packageMode = type === "PREPAID_PACKAGE";

  // Calculate new amount for display in modal
  const calculateNewAmount = (formData: FormData): number => {
    const feePerLesson = intValue(formData, "feePerLesson");
    const fixedMonthlyFee = intValue(formData, "fixedMonthlyFee");
    const packageLessons = intValue(formData, "packageLessons");
    const packagePrice = intValue(formData, "packagePrice");

    if (type === "FIXED_MONTHLY") return fixedMonthlyFee ?? 0;
    if (type === "PREPAID_PACKAGE" && packageLessons && packageLessons > 0) {
      return Math.round((packagePrice ?? 0) / packageLessons);
    }
    return feePerLesson ?? 0;
  };

  function intValue(formData: FormData, key: string): number | undefined {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(/[^\d]/g, ""));
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    const formData = new FormData(e.currentTarget);
    const newAmount = calculateNewAmount(formData);
    const currentAmount = tuition?.feePerLesson ?? tuition?.fixedMonthlyFee ?? 0;

    // Only show modal if there are completed lessons and the amount changed
    if (completedLessonsCount > 0 && newAmount !== currentAmount) {
      e.preventDefault();
      setPendingData({ formData, newAmount });
      setShowConfirmModal(true);
    }
    // Otherwise let the form submit normally
  };

  const handleConfirmUpdate = async (updatePast: boolean) => {
    if (!pendingData) return;

    const { formData, newAmount } = pendingData;
    formData.set("updatePastLessons", updatePast ? "true" : "false");

    setShowConfirmModal(false);
    setPendingData(null);

    // Submit the form programmatically
    await updateTuitionConfig(formData);
  };

  return (
    <>
      <form action={updateTuitionConfig} onSubmit={handleSubmit} className="card grid gap-3 p-4">
        <h2 className="text-lg font-black">Cập nhật học phí</h2>
        <input name="classId" type="hidden" value={classId} />
        <div className="field">
          <label>Cách tính</label>
          <select name="tuitionType" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="ACTUAL_SESSIONS">Giá chung cho cả lớp / buổi</option>
            <option value="FIXED_MONTHLY">Cố định mỗi tháng</option>
            <option value="PREPAID_PACKAGE">Gói buổi trả trước</option>
            <option value="GROUP_BY_STUDENT">Giá cho mỗi học sinh / buổi</option>
            <option value="MANUAL">Nhập tổng tiền khi chốt</option>
          </select>
        </div>
        {perLesson ? <div className="field"><label>Phí mỗi buổi</label><input name="feePerLesson" inputMode="numeric" defaultValue={tuition?.feePerLesson ?? ""} required /></div> : null}
        {monthly ? <div className="field"><label>Phí mỗi tháng</label><input name="fixedMonthlyFee" inputMode="numeric" defaultValue={tuition?.fixedMonthlyFee ?? ""} required /></div> : null}
        {packageMode ? (
          <div className="grid-2">
            <div className="field"><label>Số buổi trong gói</label><input name="packageLessons" inputMode="numeric" defaultValue={tuition?.packageLessons ?? ""} required /></div>
            <div className="field"><label>Giá gói</label><input name="packagePrice" inputMode="numeric" defaultValue={tuition?.packagePrice ?? ""} required /></div>
          </div>
        ) : null}
        {type === "GROUP_BY_STUDENT" ? <p className="text-sm text-[var(--muted)]">Mức phí trên áp dụng giống nhau cho từng học sinh. Báo cáo cả lớp sẽ nhân với số học sinh đang học.</p> : null}
        <TuitionSubmitButton />
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingData && (
        <div className="modal-backdrop" onClick={() => setShowConfirmModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Cập nhật học phí</h3>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Bạn đã có <strong>{completedLessonsCount} buổi</strong> đã hoàn thành. Học phí mới: <strong>{formatMoney(pendingData.newAmount)}/buổi</strong>
            </p>
            <p className="mb-4 text-sm">Bạn có muốn cập nhật lại tiền cho các buổi đã dạy không?</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1"
                onClick={() => handleConfirmUpdate(true)}
              >
                Có, cập nhật tất cả
              </button>
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={() => handleConfirmUpdate(false)}
              >
                Không, chỉ từ nay
              </button>
            </div>
            <button
              type="button"
              className="btn w-full mt-2"
              onClick={() => setShowConfirmModal(false)}
            >
              Hủy
            </button>
          </div>
        </div>
      )}
    </>
  );
}

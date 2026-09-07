"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { updateTuitionConfig } from "@/lib/actions";
import { formatMoney } from "@/lib/format";

function TuitionSubmitButton() {
  return (
    <SubmitButton className="w-fit" pendingText="Đang lưu...">
      Lưu học phí
    </SubmitButton>
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
  const router = useRouter();
  const [type, setType] = useState(tuition?.type ?? "THEO_BUOI");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState<{ formData: FormData; newAmount: number } | null>(null);
  const [confirmChoice, setConfirmChoice] = useState<"all" | "future" | null>(null);
  const [isConfirmPending, startConfirmTransition] = useTransition();

  const isTheoBuoi = type === "THEO_BUOI";
  const isTheoThang = type === "THEO_THANG";
  const isTheoGoi = type === "THEO_GOI";

  // Calculate new amount for display in modal
  const calculateNewAmount = (formData: FormData): number => {
    const feePerLesson = intValue(formData, "feePerLesson");
    const fixedMonthlyFee = intValue(formData, "fixedMonthlyFee");

    if (isTheoThang) return fixedMonthlyFee ?? 0;
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

  const handleConfirmUpdate = (updatePast: boolean) => {
    if (!pendingData || isConfirmPending) return;

    const { formData } = pendingData;
    formData.set("updatePastLessons", updatePast ? "true" : "false");
    setConfirmChoice(updatePast ? "all" : "future");

    startConfirmTransition(async () => {
      try {
        await updateTuitionConfig(formData);
        setShowConfirmModal(false);
        setPendingData(null);
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Không thể cập nhật học phí.");
      } finally {
        setConfirmChoice(null);
      }
    });
  };

  return (
    <>
      <form action={updateTuitionConfig} onSubmit={handleSubmit} className="card grid gap-3 p-4">
        <h2 className="text-lg font-black">Cập nhật học phí</h2>
        <input name="classId" type="hidden" value={classId} />
        <div className="field">
          <label>Chế độ tính tiền</label>
          <select name="tuitionType" value={type} onChange={(event) => setType(event.target.value)}>
            <option value="THEO_BUOI">📅 Theo buổi - Mỗi buổi dạy tính tiền buổi đó</option>
            <option value="THEO_THANG">📆 Theo tháng - Tiền cố định mỗi tháng</option>
            <option value="THEO_GOI">📦 Theo gói - Coming soon</option>
          </select>
        </div>

        {/* THEO_BUOI: Tính tiền theo buổi */}
        {isTheoBuoi && (
          <div className="field">
            <label>Phí mỗi buổi học (VND)</label>
            <input
              name="feePerLesson"
              inputMode="numeric"
              defaultValue={tuition?.feePerLesson ?? ""}
              placeholder="VD: 200000"
              required
            />
            <p className="text-sm text-[var(--muted)]">
              Giáo viên có thể tùy chỉnh số tiền cho từng buổi học cụ thể.
            </p>
          </div>
        )}

        {/* THEO_THANG: Tiền cố định theo tháng */}
        {isTheoThang && (
          <>
            <div className="field">
              <label>Phí cố định mỗi tháng (VND)</label>
              <input
                name="fixedMonthlyFee"
                inputMode="numeric"
                defaultValue={tuition?.fixedMonthlyFee ?? ""}
                placeholder="VD: 2000000"
                required
              />
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <p className="font-medium">💡 Cách tính này hoạt động như thế nào:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Số tiền sẽ <strong>cố định mỗi tháng</strong>, không phụ thuộc vào số buổi</li>
                <li>Bạn có thể thêm buổi học bổ sung trong tháng</li>
                <li>Tiền vẫn giữ nguyên - không tăng khi thêm buổi</li>
              </ul>
            </div>
          </>
        )}

        {/* THEO_GOI: Coming soon */}
        {isTheoGoi && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center text-gray-500">
            <p className="text-lg mb-1">🚧 Tính năng đang được phát triển</p>
            <p className="text-sm">Chế độ "Theo gói" sẽ cho phép bạn bán các gói buổi học cho phụ huynh.</p>
          </div>
        )}

        <TuitionSubmitButton />
      </form>

      {/* Confirmation Modal */}
      {showConfirmModal && pendingData && (
        <div className="modal-backdrop" onClick={() => !isConfirmPending && setShowConfirmModal(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Cập nhật học phí</h3>
            <p className="mb-4 text-sm text-[var(--muted)]">
              Bạn đã có <strong>{completedLessonsCount} buổi</strong> đã hoàn thành.
              Học phí mới: <strong>{formatMoney(pendingData.newAmount)}</strong>
              {isTheoBuoi && "/buổi"}
            </p>
            <p className="mb-4 text-sm">Bạn có muốn cập nhật lại tiền cho các buổi đã dạy không?</p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={isConfirmPending}
                onClick={() => handleConfirmUpdate(true)}
              >
                {confirmChoice === "all" ? "Đang cập nhật..." : "Có, cập nhật tất cả"}
              </button>
              <button
                type="button"
                className="btn btn-secondary flex-1"
                disabled={isConfirmPending}
                onClick={() => handleConfirmUpdate(false)}
              >
                {confirmChoice === "future" ? "Đang cập nhật..." : "Không, chỉ từ nay"}
              </button>
            </div>
            <button
              type="button"
              className="btn w-full mt-2"
              disabled={isConfirmPending}
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

"use client";

import { SubmitButton } from "@/components/submit-button";
import { toggleReportLink, rotateReportToken, addPayment, markReportPaid } from "@/lib/actions";

function ToggleLinkButton({ isEnabled }: { isEnabled: boolean }) {
  return (
    <SubmitButton variant="secondary" pendingText="Đang xử lý...">
      {isEnabled ? "Tắt link" : "Bật link"}
    </SubmitButton>
  );
}

function RotateTokenButton() {
  return (
    <SubmitButton variant="secondary" pendingText="Đang xử lý...">
      Tạo lại token
    </SubmitButton>
  );
}

export function ToggleLinkForm({ reportId, isEnabled }: { reportId: string; isEnabled: boolean }) {
  return (
    <form action={toggleReportLink}>
      <input name="reportId" type="hidden" value={reportId} />
      <ToggleLinkButton isEnabled={isEnabled} />
    </form>
  );
}

export function RotateTokenForm({ reportId }: { reportId: string }) {
  return (
    <form action={rotateReportToken}>
      <input name="reportId" type="hidden" value={reportId} />
      <RotateTokenButton />
    </form>
  );
}

export function QuickPaidForm({ reportId, remaining }: { reportId: string; remaining: number }) {
  return (
    <form action={markReportPaid.bind(null, reportId)} className="card grid gap-3 p-4">
      <h2 className="text-lg font-black">Thanh toán nhanh</h2>
      <p>Còn lại {remaining.toLocaleString("vi-VN")} đ</p>
      <SubmitButton className="w-fit" pendingText="Đang xử lý...">
        Đã nhận đủ hôm nay
      </SubmitButton>
    </form>
  );
}

export function PaymentForm({ reportId }: { reportId: string }) {
  return (
    <form action={addPayment} className="card grid gap-3 p-4">
      <input name="reportId" type="hidden" value={reportId} />
      <h2 className="text-lg font-black">Ghi nhận thanh toán</h2>
      <div className="field"><label>Số tiền</label><input name="amount" inputMode="numeric" required /></div>
      <div className="field"><label>Ngày thanh toán</label><input name="paidAt" type="date" /></div>
      <div className="field"><label>Phương thức</label><input name="method" placeholder="Chuyển khoản, tiền mặt" /></div>
      <div className="field"><label>Ghi chú</label><textarea name="note" /></div>
      <SubmitButton className="w-fit" pendingText="Đang lưu...">
        Lưu thanh toán
      </SubmitButton>
    </form>
  );
}

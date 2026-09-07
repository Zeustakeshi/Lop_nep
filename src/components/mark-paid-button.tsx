"use client";

import { useFormStatus } from "react-dom";
import { markReportPaid } from "@/lib/actions";

export function MarkPaidButton({ reportId }: { reportId: string }) {
  const { pending } = useFormStatus();

  return (
    <form action={markReportPaid.bind(null, reportId)}>
      <button
        className="btn btn-secondary"
        type="submit"
        disabled={pending}
      >
        {pending ? "Đang xử lý..." : "Đã nhận đủ"}
      </button>
    </form>
  );
}

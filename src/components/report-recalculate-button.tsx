"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { recalculateReport } from "@/lib/actions";
import { RefreshCw } from "lucide-react";

export function ReportRecalculateButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const formData = new FormData();
    formData.set("reportId", reportId);

    startTransition(async () => {
      try {
        await recalculateReport(formData);
        router.refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : "Không thể đồng bộ báo cáo.");
      }
    });
  }

  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={handleClick}
      disabled={isPending}
      title="Đồng bộ lại số liệu từ các buổi học hiện tại"
    >
      <RefreshCw size={18} className={isPending ? "animate-spin" : ""} />
      {isPending ? "Đang đồng bộ..." : "Đồng bộ lại"}
    </button>
  );
}

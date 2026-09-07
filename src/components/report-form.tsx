"use client";

import { SubmitButton } from "@/components/submit-button";
import { createReport } from "@/lib/actions";

export function ReportForm({ children }: { children: React.ReactNode }) {
  return (
    <form action={createReport} className="card mb-6 grid gap-3 p-4">
      <h2 className="text-lg font-black">Tạo báo cáo</h2>
      {children}
      <SubmitButton className="w-fit" pendingText="Đang tạo...">
        Chốt báo cáo
      </SubmitButton>
    </form>
  );
}

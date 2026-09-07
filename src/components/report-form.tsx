"use client";

import { useFormStatus } from "react-dom";
import { createReport } from "@/lib/actions";

export function ReportForm({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <form action={createReport} className="card mb-6 grid gap-3 p-4">
      <h2 className="text-lg font-black">Tạo báo cáo</h2>
      {children}
      <button className="btn btn-primary w-fit" type="submit" disabled={pending}>
        {pending ? "Đang tạo..." : "Chốt báo cáo"}
      </button>
    </form>
  );
}

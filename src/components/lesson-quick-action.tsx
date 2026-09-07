"use client";

import { SubmitButton } from "@/components/submit-button";
import { quickUpdateLessonStatus } from "@/lib/actions";

interface LessonQuickActionProps {
  lessonId: string;
  status: string;
  variant?: "primary" | "secondary";
}

export function LessonQuickAction({ lessonId, status, variant = "secondary" }: LessonQuickActionProps) {
  return (
    <form action={quickUpdateLessonStatus.bind(null, { lessonId, status })}>
      <SubmitButton variant={variant} pendingText="Đang xử lý...">
        Đã dạy
      </SubmitButton>
    </form>
  );
}

"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "",
  variant = "primary",
  disabled = false,
  pendingText = "Đang xử lý..."
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();

  const variantClasses = {
    primary: "btn btn-primary",
    secondary: "btn btn-secondary",
    danger: "btn btn-danger"
  };

  return (
    <button
      type="submit"
      className={`${variantClasses[variant]} ${className}`}
      disabled={pending || disabled}
      aria-disabled={pending || disabled}
    >
      {pending ? (
        <>
          <span className="animate-spin" aria-hidden="true">⟳</span>
          {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}

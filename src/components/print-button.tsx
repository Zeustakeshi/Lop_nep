"use client";

import { Download } from "lucide-react";

export function PrintButton({ label = "Lưu / In PDF" }: { label?: string }) {
  return (
    <button className="btn btn-secondary" type="button" onClick={() => window.print()}>
      <Download size={16} />
      {label}
    </button>
  );
}

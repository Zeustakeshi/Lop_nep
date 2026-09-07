import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lớp Nếp",
    template: "%s | Lớp Nếp"
  },
  description: "Quản lý lớp học, lịch dạy, học phí và báo cáo phụ huynh dành cho giáo viên.",
  icons: {
    icon: "/lop-nep-logo.png",
    apple: "/lop-nep-logo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <ThemeProvider>
        <html lang="vi" suppressHydrationWarning>
          <body>{children}</body>
        </html>
      </ThemeProvider>
    </ClerkProvider>
  );
}

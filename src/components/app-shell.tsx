"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { useState } from "react";
import { Brand } from "@/components/brand";
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  ReceiptText,
  Settings
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Hôm nay", icon: LayoutDashboard },
  { href: "/classes", label: "Lớp học", icon: GraduationCap },
  { href: "/schedule", label: "Lịch dạy", icon: CalendarDays },
  { href: "/reports", label: "Học phí", icon: ReceiptText },
  { href: "/settings", label: "Cài đặt", icon: Settings }
];


export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--panel)]/95 backdrop-blur">
        <div className="container flex min-h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="icon-button"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label={sidebarOpen ? "Thu gọn thanh điều hướng" : "Mở thanh điều hướng"}
              aria-expanded={sidebarOpen}
              aria-controls="app-sidebar"
              title={sidebarOpen ? "Thu gọn menu" : "Mở menu"}
            >
              {sidebarOpen ? <PanelLeftClose size={19} /> : <Menu size={19} />}
            </button>
            <Brand compact />
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>
      <div
        className={`container grid gap-6 py-6 transition-[grid-template-columns] duration-200 ${
          sidebarOpen ? "lg:grid-cols-[220px_1fr]" : "lg:grid-cols-[64px_1fr]"
        }`}
      >
        <nav
          id="app-sidebar"
          className={`no-print overflow-x-auto lg:sticky lg:top-20 lg:self-start lg:overflow-visible ${
            sidebarOpen ? "flex gap-2 lg:block lg:space-y-1" : "hidden lg:block lg:space-y-1"
          }`}
        >
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-10 shrink-0 items-center rounded-md px-3 text-sm font-bold text-[var(--muted)] hover:bg-[var(--secondary)] ${
                  sidebarOpen ? "gap-2" : "justify-center"
                }`}
                aria-label={!sidebarOpen ? item.label : undefined}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="shrink-0" size={18} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}

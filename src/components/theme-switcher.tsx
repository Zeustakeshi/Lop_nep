"use client";

import { useTheme } from "./theme-provider";
import { Moon, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const options = [
    {
      value: "light" as const,
      icon: Sun,
      label: "Sáng",
      title: "Chế độ sáng",
    },
    {
      value: "dark" as const,
      icon: Moon,
      label: "Tối",
      title: "Chế độ tối",
    },
    {
      value: "system" as const,
      icon: Monitor,
      label: "Hệ thống",
      title: "Theo hệ thống",
    },
  ];

  // Prevent flash of wrong theme
  if (!mounted) {
    return (
      <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1">
        {options.map((opt) => (
          <div
            key={opt.value}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold text-[var(--muted)]"
          >
            <opt.icon size={14} />
            <span className="hidden sm:inline">{opt.label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1">
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = theme === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => setTheme(opt.value)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition-all duration-150 ${
              active
                ? "bg-[var(--accent)] text-[var(--primary-foreground)] shadow-sm"
                : "text-[var(--muted)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]"
            }`}
            title={opt.title}
            aria-pressed={active}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

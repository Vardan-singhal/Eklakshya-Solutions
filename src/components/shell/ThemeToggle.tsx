"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch between light and dark theme"
      data-cursor="Theme"
      className={`relative grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface/60 text-fg backdrop-blur transition-colors hover:border-ember hover:text-accent ${className}`}
    >
      <Sun className="theme-sun absolute h-[18px] w-[18px]" aria-hidden />
      <Moon className="theme-moon absolute h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}

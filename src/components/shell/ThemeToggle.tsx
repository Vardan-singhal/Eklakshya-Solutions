"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/providers/theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggle, setPreference } = useTheme();
  return (
    <button
      type="button"
      onClick={(event) => {
        if (event.shiftKey) {
          setPreference("system");
        } else {
          void toggle(event);
        }
      }}
      aria-label="Switch between light and dark theme; Shift-click to follow system"
      title="Click to switch theme. Shift-click to follow your device theme."
      data-cursor="Theme"
      className={`relative grid h-11 w-11 place-items-center rounded-full border border-line-strong bg-surface/60 text-fg backdrop-blur transition-colors hover:border-ember hover:text-accent ${className}`}
    >
      <Sun className="theme-sun absolute h-[18px] w-[18px]" aria-hidden />
      <Moon className="theme-moon absolute h-[18px] w-[18px]" aria-hidden />
    </button>
  );
}

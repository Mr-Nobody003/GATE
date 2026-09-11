"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/50 hover:bg-neutral-300 dark:bg-neutral-800/50 dark:hover:bg-neutral-700 transition-colors focus:outline-none"
    >
      <Sun className="h-5 w-5 scale-100 transition-transform dark:scale-0 text-neutral-800" />
      <Moon className="absolute h-5 w-5 scale-0 transition-transform dark:scale-100 text-neutral-200" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}

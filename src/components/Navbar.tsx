import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { GraduationCap } from "lucide-react";

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-neutral-900 dark:text-white font-heading font-bold text-lg hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <GraduationCap className="w-5 h-5" />
          </div>
          GATE PYQ Practice
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-bold text-neutral-600 hover:text-indigo-600 dark:text-neutral-300 dark:hover:text-indigo-400 transition-colors hidden sm:block">
            Dashboard
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

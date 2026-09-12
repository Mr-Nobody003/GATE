import { GraduationCap, Code } from "lucide-react";
import { InstallPWAButton } from "./InstallPWAButton";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-colors">
      <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center md:items-start gap-2">
          <div className="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-white">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-5 h-5" />
            </div>
            GATE CSE Prep
          </div>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            Open-source dashboard for GATE Computer Science aspirants.
          </p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            Last Updated: <span className="text-neutral-900 dark:text-white"> 13 September 2026 </span>
          </p>
          <InstallPWAButton />
        </div>
        
        <div className="flex flex-col items-center md:items-end gap-3">
          <a 
            href="https://github.com/Mr-Nobody003/GATE" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-semibold text-neutral-600 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 hover:border-indigo-200 dark:hover:border-indigo-900/50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
            View on GitHub
          </a>
          <p className="flex items-center gap-1.5 text-xs font-semibold text-neutral-400 dark:text-neutral-500">
            Built with <Code className="w-3.5 h-3.5" /> using Next.js & Tailwind
          </p>
        </div>
      </div>
    </footer>
  );
}

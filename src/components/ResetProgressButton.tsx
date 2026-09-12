"use client";

export function ResetProgressButton() {
  return (
    <button
      onClick={() => {
        if (window.confirm("⚠️ WARNING: This will permanently delete all your solved progress, answers, and important markers! Are you absolutely sure you want to reset everything?")) {
          localStorage.clear();
          window.location.reload();
        }
      }}
      className="px-6 py-3 text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all shadow-sm flex items-center gap-2"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
      Reset All Progress
    </button>
  );
}

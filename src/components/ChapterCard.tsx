"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ParsedChapter } from "@/lib/data";
import { Star, CheckCircle2 } from "lucide-react";

export function ChapterCard({ chapter, volId }: { chapter: ParsedChapter; volId: string }) {
  const [stats, setStats] = useState({ solved: 0, important: 0 });
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    let solved = 0;
    let important = 0;
    chapter.questions.forEach((q) => {
      const saved = localStorage.getItem(`q_state_${q.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.isRevealed) solved++;
        if (parsed.isImportant) important++;
      }
    });
    setStats({ solved, important });
  }, [chapter.questions]);

  const noteCount = chapter.notes.length;
  const questionCount = chapter.questions.length;
  const progress = questionCount > 0 ? (stats.solved / questionCount) * 100 : 0;
  const isFullySolved = questionCount > 0 && stats.solved === questionCount;

  return (
    <Link 
      href={`/practice/${volId}/${chapter.id}`}
      className={`group p-6 rounded-2xl border bg-white dark:bg-neutral-900/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden relative ${
        isFullySolved 
          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/10 dark:bg-emerald-900/10' 
          : 'border-neutral-200 dark:border-neutral-800 hover:border-indigo-400 dark:hover:border-indigo-500'
      }`}
    >
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -z-10 transition-transform duration-500 group-hover:scale-[1.5] ${
        isFullySolved ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'
      }`} />
      
      <div className="flex justify-between items-start gap-4">
        <h3 className={`font-heading font-bold text-lg transition-colors line-clamp-2 ${
          isFullySolved ? 'text-emerald-900 dark:text-emerald-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400' : 'text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
        }`} title={chapter.name}>
          {chapter.name}
        </h3>
        
        {/* Circular Progress Indicator */}
        {isClient && questionCount > 0 && (
          <div className="relative shrink-0 flex items-center justify-center w-12 h-12">
            <svg className="w-12 h-12 -rotate-90 transform" viewBox="0 0 36 36">
              {/* Background Track (Dotted) */}
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                className="stroke-neutral-200 dark:stroke-neutral-800"
                strokeWidth="3"
                strokeDasharray="2 4"
              />
              {/* Progress Bar */}
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                className={isFullySolved ? "stroke-emerald-500" : "stroke-indigo-500"}
                strokeWidth="3"
                strokeDasharray={`${progress * 0.94} 100`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              {isFullySolved ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-300">
                  {Math.round(progress)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-3 py-1.5 rounded-full transition-colors group-hover:bg-neutral-200 dark:group-hover:bg-neutral-700">
          {noteCount} Note(s)
        </span>
        <span className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
          isFullySolved 
            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50'
            : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50'
        }`}>
          {isClient && stats.solved > 0 ? `${stats.solved}/${questionCount} Solved` : `${questionCount} PYQ(s)`}
        </span>
        {isClient && stats.important > 0 && (
          <span className="text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 px-3 py-1.5 rounded-full flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-current" /> {stats.important}
          </span>
        )}
      </div>
    </Link>
  );
}

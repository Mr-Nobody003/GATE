"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, BookOpen } from "lucide-react";
import { ParsedChapter } from "@/lib/data";

type VolumeData = {
  id: string;
  name: string;
  chapters: ParsedChapter[];
};

export function PracticeSidebar({
  volumes,
  currentVolId,
  currentChapId,
}: {
  volumes: VolumeData[];
  currentVolId: string;
  currentChapId: string;
}) {
  // Keep chapters closed by default as requested
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set());
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleChapter = (uniqueId: string) => {
    const next = new Set(openChapters);
    if (next.has(uniqueId)) {
      next.delete(uniqueId);
    } else {
      next.add(uniqueId);
    }
    setOpenChapters(next);
  };

  return (
    <aside className="w-full lg:w-72 shrink-0 lg:h-[calc(100vh-80px)] lg:overflow-y-auto lg:sticky top-4 lg:top-20 lg:border-r border-neutral-200 dark:border-neutral-800 pr-0 lg:pr-4 custom-scrollbar z-40 relative">
      <button 
        className="w-full lg:hidden flex items-center justify-between p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl font-bold text-neutral-700 dark:text-neutral-200 shadow-sm"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        <span className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-500" />
          Course Navigation
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isMobileOpen ? "rotate-180" : ""}`} />
      </button>

      <div className={`mt-2 lg:mt-0 ${isMobileOpen ? "block" : "hidden"} lg:block bg-neutral-50 dark:bg-neutral-950 lg:bg-transparent absolute lg:relative w-full left-0 border lg:border-0 border-neutral-200 dark:border-neutral-800 rounded-xl lg:rounded-none p-4 lg:p-0 shadow-lg lg:shadow-none`}>
        <div className="mb-6 px-2 hidden lg:block">
          <h3 className="text-xs font-bold tracking-widest text-neutral-500 uppercase flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Course Navigation
          </h3>
        </div>
      
      <div className="space-y-6">
        {volumes.map((vol) => (
          <div key={vol.id} className="space-y-2">
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 px-2 uppercase tracking-wider">{vol.name}</h4>
            <div className="space-y-1">
              {vol.chapters.map((chapter) => {
                const uniqueId = `${vol.id}-${chapter.id}`;
                const isOpen = openChapters.has(uniqueId);
                const isCurrent = currentChapId === chapter.id && currentVolId === vol.id;
                
                // Derive subtopics
                const topicsSet = new Set<string>();
                chapter.questions.forEach(q => {
                  if (q.topic) topicsSet.add(q.topic);
                });
                const topics = Array.from(topicsSet);

                return (
                  <div key={uniqueId} className="flex flex-col">
                    <div className="flex items-center group">
                      <Link 
                        href={`/practice/${vol.id}/${chapter.id}`}
                        className={`flex-1 text-sm font-medium px-2 py-2 rounded-lg transition-colors ${
                          isCurrent 
                            ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300" 
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        {chapter.name}
                      </Link>
                      {topics.length > 0 && (
                        <button
                          onClick={() => toggleChapter(uniqueId)}
                          className="p-2 ml-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    
                    {isOpen && topics.length > 0 && (
                      <div className="ml-4 mt-1 pl-3 border-l border-neutral-200 dark:border-neutral-800 space-y-1">
                        {topics.map((topic, idx) => (
                          <Link
                            key={idx}
                            href={`/practice/${vol.id}/${chapter.id}#topic-${topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
                            className="block text-xs font-medium text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 py-1.5 px-2 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors truncate"
                            title={topic}
                          >
                            {topic}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

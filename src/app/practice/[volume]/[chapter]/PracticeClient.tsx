"use client";

import { Link } from "next-view-transitions";
import QuestionCard from "@/components/QuestionCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Maximize2, Minimize2, Star, CheckCircle2, ArrowUp } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { ParsedChapter, ParsedQuestion } from "@/lib/data";
import { PracticeSidebar, SidebarVolumeData } from "@/components/PracticeSidebar";

const GlowingLoader = ({ size = "lg" }: { size?: "sm" | "lg" }) => {
  const dim = size === "lg" ? "w-10 h-10" : "w-6 h-6";
  return (
    <div className={`relative flex items-center justify-center ${dim}`}>
      <div className="absolute inset-0 rounded-full border-2 border-indigo-500/20 dark:border-indigo-400/20" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 dark:border-t-indigo-400 animate-spin" style={{ animationDuration: '0.8s' }} />
      <div className="absolute inset-1.5 rounded-full border-2 border-transparent border-b-indigo-400 dark:border-b-indigo-300 animate-spin opacity-80" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }} />
    </div>
  );
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PracticeClient({
  chapterData,
  volumeId,
  volumeName,
  allVolumes,
}: {
  chapterData: ParsedChapter;
  volumeId: string;
  volumeName: string;
  allVolumes: SidebarVolumeData[];
}) {
  const [activeTab, setActiveTab] = useState<"notes" | "pyq">("notes");
  
  const handleTabChange = (tab: "notes" | "pyq") => {
    setActiveTab(tab);
  };

  const [openTopics, setOpenTopics] = useState<Set<string>>(new Set());
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const questions = chapterData.questions;
  const notes = chapterData.notes;

  const topicGroups = useMemo(() => {
    const groups = new Map<string, ParsedQuestion[]>();
    for (const q of questions) {
      const key = q.displayTopic;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(q);
    }
    return Array.from(groups.entries());
  }, [questions]);



  const toggleTopic = (topic: string) => {
    setOpenTopics(prev => {
      const next = new Set(prev);
      next.has(topic) ? next.delete(topic) : next.add(topic);
      return next;
    });
  };

  const allOpen = topicGroups.length > 0 && topicGroups.every(([topic]) => openTopics.has(topic));
  const toggleAll = () => {
    setOpenTopics(allOpen ? new Set() : new Set(topicGroups.map(([topic]) => topic)));
  };

  if (questions.length === 0 && notes.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 p-8 flex flex-col items-center justify-center transition-colors">
        <h1 className="text-2xl font-bold">Chapter not found or no content.</h1>
        <Link href="/" className="text-indigo-500 mt-4 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen text-neutral-900 dark:text-neutral-50 p-4 sm:p-8 transition-colors duration-300">
      <div className="flex flex-col lg:flex-row max-w-[90rem] mx-auto gap-4 sm:gap-8 items-start relative">
        {!isFocusMode && <PracticeSidebar volumes={allVolumes} currentVolId={volumeId} currentChapId={chapterData.id} />}
        
        <div 
          className={isFocusMode ? "fixed inset-0 z-50 overflow-y-auto bg-neutral-50 dark:bg-neutral-950 p-4 sm:p-8 space-y-8 transition-all" : "flex-1 min-w-0 max-w-4xl space-y-8 transition-all"}
          style={{ viewTransitionName: 'main-content' }}
        >
        <div className={`flex items-center justify-between ${isFocusMode ? 'max-w-5xl mx-auto' : ''}`}>
          <Link href="/" className="text-sm font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-all active:scale-95 flex items-center gap-2 bg-neutral-200/50 dark:bg-neutral-800/50 px-4 py-2 rounded-full w-max">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Back to Dashboard
          </Link>
        </div>
        
        <header className={`space-y-6 ${isFocusMode ? 'max-w-5xl mx-auto' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wide uppercase text-sm mb-1">{volumeName}</p>
              <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white leading-tight tracking-tight">{chapterData.name}</h1>
            </div>
          </div>
          
          <div className="sticky top-16 z-40 bg-neutral-50/95 dark:bg-neutral-950/95 backdrop-blur-md pt-2 flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 -mx-4 px-4 sm:-mx-8 sm:px-8">
            <div className="flex gap-2 sm:gap-4">
              <button 
                className={`px-4 sm:px-6 py-3 font-bold text-sm sm:text-base transition-all active:scale-95 relative ${activeTab === 'notes' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'}`}
                onClick={() => handleTabChange('notes')}
              >
                Notes 
                <span className="ml-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 py-0.5 px-2 rounded-full text-xs">{notes.length}</span>
                {activeTab === 'notes' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                )}
              </button>
              <button 
                className={`px-4 sm:px-6 py-3 font-bold text-sm sm:text-base transition-all active:scale-95 relative ${activeTab === 'pyq' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'}`}
                onClick={() => handleTabChange('pyq')}
              >
                Practice PYQs 
                <span className="ml-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 py-0.5 px-2 rounded-full text-xs">{questions.length}</span>
                {activeTab === 'pyq' && (
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 shrink-0 mb-2">
              {activeTab === 'pyq' && topicGroups.length > 0 && (
                <button
                  onClick={toggleAll}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 transition-all active:scale-95 shrink-0"
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              )}
              <button
                onClick={() => setIsFocusMode(!isFocusMode)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-sm font-bold text-neutral-600 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400 shadow-sm hover:shadow-md transition-all active:scale-95 shrink-0"
                title={isFocusMode ? "Exit Focus Mode" : "Enter Focus Mode"}
              >
                {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                <span className="hidden sm:inline">{isFocusMode ? "Exit Focus" : "Focus Mode"}</span>
              </button>
            </div>
          </div>
        </header>

        <div className={activeTab === 'notes' ? "block" : "hidden"}>
          <section className={`space-y-8 ${isFocusMode ? 'max-w-5xl mx-auto' : ''}`}>
            {notes.length > 0 ? (
              <>
                {notes.map((note: any) => (
                  <NoteCard key={note.id} content={note.formattedContent} contentHtml={note.contentHtml} />
                ))}
              </>
            ) : (
                <div className="text-center p-12 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl text-neutral-500 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-900/20">
                  <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  </div>
                  <p className="font-semibold text-lg">No notes available for this chapter.</p>
                </div>
              )}
            </section>
        </div>

        <div className={activeTab === 'pyq' ? "block" : "hidden"}>
          <section className={`space-y-6 ${isFocusMode ? 'max-w-5xl mx-auto' : ''}`}>
            {topicGroups.length > 0 ? (
              topicGroups.map(([topic, topicQuestions], index) => (
                  <TopicAccordion
                    key={topic}
                    topic={topic}
                    topicQuestions={topicQuestions}
                    index={index}
                    isOpen={openTopics.has(topic)}
                    onToggle={() => toggleTopic(topic)}
                  />
                ))
              ) : (
                <div className="text-center p-12 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl text-neutral-500 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-900/20">
                   <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </div>
                  <p className="font-semibold text-lg">No practice questions available for this chapter.</p>
                </div>
              )}
            </section>
        </div>
      </div>
      </div>

      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all active:scale-90 z-50 flex items-center justify-center animate-in fade-in slide-in-from-bottom-4"
          title="Back to Top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}
    </main>
  );
}

function NoteCard({ content, contentHtml }: { content: string, contentHtml: React.ReactNode }) {
  const outline = useMemo(
    () => Array.from(content.matchAll(/^## (.+)$/gm)).map(m => m[1]),
    [content]
  );

  return (
    <div className="relative p-6 sm:p-10 rounded-2xl border-l-8 border-indigo-500 border-y border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-md transition-all hover:shadow-lg overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -z-10" />

      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800/50">
        <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        </div>
        <div>
          <h3 className="font-heading font-extrabold text-xl text-neutral-900 dark:text-white">Study Notes</h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">Concept reference &amp; formula sheet for this chapter</p>
        </div>
      </div>

      {outline.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8 pb-6 border-b border-dashed border-neutral-200 dark:border-neutral-800">
          {outline.map((h, index) => (
            <a
              key={`${h}-${index}`}
              href={`#${slugify(h)}`}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              {h}
            </a>
          ))}
        </div>
      )}

      <div className="prose prose-lg prose-indigo dark:prose-invert max-w-none text-neutral-800 dark:text-neutral-200 leading-relaxed text-[1.05rem]">
        {contentHtml}
      </div>
    </div>
  );
}

function TopicAccordion({
  topic,
  topicQuestions,
  index,
  isOpen,
  onToggle,
}: {
  topic: string;
  topicQuestions: ParsedQuestion[];
  index: number;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [stats, setStats] = useState({ solved: 0, important: 0 });

  useEffect(() => {
    const calculateStats = () => {
      let solved = 0;
      let important = 0;
      topicQuestions.forEach(q => {
        const saved = localStorage.getItem(`q_state_${q.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.isRevealed) solved++;
          if (parsed.isImportant) important++;
        }
      });
      setStats({ solved, important });
    };

    calculateStats();
    window.addEventListener('q_state_changed', calculateStats);
    return () => window.removeEventListener('q_state_changed', calculateStats);
  }, [topicQuestions]);

  const [qRenderLimit, setQRenderLimit] = useState(3);
  useEffect(() => {
    const isDesk = window.innerWidth >= 1024;
    if (isDesk) {
      setQRenderLimit(1000); // Instantly render all on desktop
      return;
    }
    if (isOpen && qRenderLimit < topicQuestions.length) {
      const timer = setTimeout(() => setQRenderLimit(prev => prev + 3), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, qRenderLimit, topicQuestions.length]);

  const isFullySolved = stats.solved > 0 && stats.solved === topicQuestions.length;

  return (
    <div 
      id={`topic-${topic.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`}
      className={`border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 scroll-mt-24 ${isFullySolved ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50'}`}
    >
      <button 
        onClick={onToggle}
        className={`w-full flex items-center justify-between p-6 transition-all active:scale-[0.98] ${isFullySolved ? 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20' : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'}`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-sm shrink-0 transition-colors ${isFullySolved ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'}`}>
            {isFullySolved ? <CheckCircle2 className="w-5 h-5" /> : index + 1}
          </div>
          <div className="text-left">
            <h2 className="font-heading text-xl font-bold text-neutral-900 dark:text-white">{topic}</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className={`text-sm font-bold ${isFullySolved ? 'text-emerald-600 dark:text-emerald-400' : 'text-neutral-500 dark:text-neutral-400'}`}>
                {stats.solved}/{topicQuestions.length} Solved
              </p>
              {stats.important > 0 && (
                <span className="flex items-center gap-1 text-xs font-bold text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-500/20">
                  <Star className="w-3 h-3 fill-current" /> {stats.important} Important
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''} ${isFullySolved ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>
      
      {isOpen && (
        <div className="p-6 pt-0 border-t border-neutral-100 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/20">
          <div className="space-y-6 mt-6">
            {topicQuestions.slice(0, qRenderLimit).map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
            {qRenderLimit < topicQuestions.length && (
              <div className="flex justify-center py-4">
                <GlowingLoader size="sm" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

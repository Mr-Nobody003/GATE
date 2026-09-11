"use client";

import Link from "next/link";
import QuestionCard from "@/components/QuestionCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import 'katex/dist/katex.min.css';
import { useState } from "react";
import { ParsedChapter } from "@/lib/data";

export default function PracticeClient({
  chapterData,
  volumeId,
  volumeName
}: {
  chapterData: ParsedChapter;
  volumeId: string;
  volumeName: string;
}) {
  const [activeTab, setActiveTab] = useState<"notes" | "pyq">("notes");

  const questions = chapterData.questions;
  const notes = chapterData.notes;

  if (questions.length === 0 && notes.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 p-8 flex flex-col items-center justify-center transition-colors">
        <h1 className="text-2xl font-bold">Chapter not found or no content.</h1>
        <Link href="/" className="text-indigo-500 mt-4 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 p-4 sm:p-8 transition-colors duration-300">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white transition-colors flex items-center gap-2 bg-neutral-200/50 dark:bg-neutral-800/50 px-4 py-2 rounded-full">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            Dashboard
          </Link>
          <ThemeToggle />
        </div>
        
        <header className="space-y-6">
          <div>
            <p className="text-indigo-600 dark:text-indigo-400 font-bold tracking-wide uppercase text-sm mb-1">{volumeName}</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 dark:text-white leading-tight tracking-tight">{chapterData.name}</h1>
          </div>
          
          <div className="flex gap-2 sm:gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-0">
            <button 
              className={`px-4 sm:px-6 py-3 font-bold text-sm sm:text-base transition-all relative ${activeTab === 'notes' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'}`}
              onClick={() => setActiveTab('notes')}
            >
              Notes 
              <span className="ml-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 py-0.5 px-2 rounded-full text-xs">{notes.length}</span>
              {activeTab === 'notes' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              )}
            </button>
            <button 
              className={`px-4 sm:px-6 py-3 font-bold text-sm sm:text-base transition-all relative ${activeTab === 'pyq' ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-300'}`}
              onClick={() => setActiveTab('pyq')}
            >
              Practice PYQs 
              <span className="ml-2 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 py-0.5 px-2 rounded-full text-xs">{questions.length}</span>
              {activeTab === 'pyq' && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 dark:bg-indigo-400 rounded-t-full shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
              )}
            </button>
          </div>
        </header>

        {activeTab === 'notes' && (
          <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {notes.length > 0 ? notes.map((note) => (
              <div key={note.id} className="relative p-6 sm:p-10 rounded-2xl border-l-8 border-indigo-500 border-y border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-md transition-all hover:shadow-lg overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                
                <h3 className="font-extrabold text-2xl text-neutral-900 dark:text-white mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800/50 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                  </div>
                  {note.topic}
                </h3>
                
                <div className="text-neutral-800 dark:text-neutral-200 leading-relaxed space-y-4 font-medium text-[1.05rem]">
                  <ReactMarkdown 
                    remarkPlugins={[remarkMath]} 
                    rehypePlugins={[[rehypeKatex, { strict: false }], rehypeRaw]}
                    components={{
                      p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                      img: ({node, ...props}) => <img style={{maxWidth: '100%', height: 'auto', display: 'block', margin: '2rem auto', borderRadius: '0.75rem', border: '1px solid #e5e7eb', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'}} {...props} />,
                      h1: ({node, ...props}) => <h1 className="text-3xl font-black text-indigo-900 dark:text-indigo-300 mt-10 mb-6" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mt-8 mb-4 flex items-center gap-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xl font-bold text-neutral-800 dark:text-neutral-200 mt-6 mb-3" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-inside space-y-3 my-6 bg-neutral-50 dark:bg-neutral-950/50 p-6 rounded-xl border border-neutral-100 dark:border-neutral-800" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal list-inside space-y-3 my-6 bg-neutral-50 dark:bg-neutral-950/50 p-6 rounded-xl border border-neutral-100 dark:border-neutral-800" {...props} />,
                      li: ({node, ...props}) => <li className="text-neutral-700 dark:text-neutral-300 pl-2" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-extrabold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1 py-0.5 rounded" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 p-4 my-6 italic text-neutral-600 dark:text-neutral-400 rounded-r-lg" {...props} />
                    }}
                  >
                    {note.content}
                  </ReactMarkdown>
                </div>
              </div>
            )) : (
              <div className="text-center p-12 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl text-neutral-500 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-900/20">
                <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                </div>
                <p className="font-semibold text-lg">No notes available for this chapter.</p>
              </div>
            )}
          </section>
        )}

        {activeTab === 'pyq' && (
          <section className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {questions.length > 0 ? (
              Object.entries(
                questions.reduce((acc, q) => {
                  if (!acc[q.topic]) acc[q.topic] = [];
                  acc[q.topic].push(q);
                  return acc;
                }, {} as Record<string, typeof questions>)
              ).map(([topic, topicQuestions], index) => (
                <TopicAccordion key={topic} topic={topic} topicQuestions={topicQuestions} index={index} />
              ))
            ) : (
              <div className="text-center p-12 border border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl text-neutral-500 dark:text-neutral-500 bg-neutral-100/50 dark:bg-neutral-900/20">
                 <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                </div>
                <p className="font-semibold text-lg">No practice questions available for this chapter.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function TopicAccordion({ topic, topicQuestions, index }: { topic: string, topicQuestions: any[], index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl bg-white dark:bg-neutral-900/50 shadow-sm overflow-hidden transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black shadow-sm">
            {index + 1}
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{topic}</h2>
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mt-1">{topicQuestions.length} Question{topicQuestions.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className={`w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </button>
      
      {isOpen && (
        <div className="p-6 pt-0 border-t border-neutral-100 dark:border-neutral-800/50 bg-neutral-50/50 dark:bg-neutral-900/20">
          <div className="space-y-6 mt-6">
            {topicQuestions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

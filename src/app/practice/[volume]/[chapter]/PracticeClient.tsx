"use client";

import Link from "next/link";
import QuestionCard from "@/components/QuestionCard";
import Latex from "react-latex-next";
import 'katex/dist/katex.min.css';
import { useState } from "react";
import { ParsedData } from "@/lib/data";

export default function PracticeClient({
  chapterName,
  chapterSlug,
  volumeData
}: {
  chapterName: string;
  chapterSlug: string;
  volumeData: NonNullable<ParsedData["volumes"][string]>;
}) {
  const [activeTab, setActiveTab] = useState<"notes" | "pyq">("notes");

  const questions = volumeData.questions.filter(q => q.topicSlug === chapterSlug);
  const notes = volumeData.notes.filter(n => n.topicSlug === chapterSlug);

  if (questions.length === 0 && notes.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Topic not found or no content.</h1>
        <Link href="/" className="text-blue-400 mt-4 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="text-sm text-neutral-400 hover:text-white transition-colors">
          ← Back to Dashboard
        </Link>
        
        <header className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-white leading-snug">{chapterName}</h1>
              <p className="text-neutral-400 mt-1">{volumeData.name}</p>
            </div>
          </div>
          
          <div className="flex gap-4 border-b border-neutral-800 pb-2">
            <button 
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'notes' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-neutral-500 hover:text-neutral-300'}`}
              onClick={() => setActiveTab('notes')}
            >
              Notes ({notes.length})
            </button>
            <button 
              className={`px-4 py-2 font-medium transition-colors ${activeTab === 'pyq' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-neutral-500 hover:text-neutral-300'}`}
              onClick={() => setActiveTab('pyq')}
            >
              PYQs ({questions.length})
            </button>
          </div>
        </header>

        {activeTab === 'notes' && (
          <section className="space-y-6">
            {notes.length > 0 ? notes.map((note) => (
              <div key={note.id} className="p-6 rounded-xl border border-blue-900/50 bg-blue-950/10 space-y-4">
                <div className="text-neutral-300 leading-relaxed space-y-4 whitespace-pre-wrap">
                  <Latex>{note.content}</Latex>
                </div>
              </div>
            )) : (
              <div className="text-center p-12 border border-neutral-800 rounded-xl text-neutral-500">
                No notes available for this topic.
              </div>
            )}
          </section>
        )}

        {activeTab === 'pyq' && (
          <section className="space-y-6">
            {questions.length > 0 ? questions.map((q) => (
              <QuestionCard key={q.id} question={q} />
            )) : (
              <div className="text-center p-12 border border-neutral-800 rounded-xl text-neutral-500">
                No previous year questions available for this topic.
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

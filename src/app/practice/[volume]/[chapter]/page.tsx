import Link from "next/link";
import volume1 from "@/../data/volume1.json";
import QuestionCard from "@/components/QuestionCard";
import Latex from "react-latex-next";
import 'katex/dist/katex.min.css';

export function generateStaticParams() {
  const chapters = Array.from(new Set(volume1.questions.map((q: any) => q.chapter)));
  return chapters.map((chapter) => ({
    volume: 'volume1',
    chapter: chapter,
  }));
}

export default function PracticePage({
  params
}: {
  params: { volume: string; chapter: string }
}) {
  const chapterName = decodeURIComponent(params.chapter);
  
  // Later we can dynamically import the correct volume based on params.volume
  // For now we just use volume1
  const questions = volume1.questions.filter(q => q.chapter === chapterName);
  const notes = volume1.notes.filter(n => n.chapter === chapterName);
  const answerKeys = volume1.answer_keys;

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Chapter not found or no questions.</h1>
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
        
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-white">{chapterName}</h1>
          <p className="text-neutral-400">{questions.length} Questions</p>
        </header>

        {notes.length > 0 && (
          <section className="p-6 rounded-xl border border-blue-900/50 bg-blue-950/20 space-y-4">
            <h2 className="text-xl font-semibold text-blue-400">Chapter Notes</h2>
            <div className="text-neutral-300 leading-relaxed space-y-4">
              {notes.map((note, i) => (
                <div key={i}><Latex>{note.content}</Latex></div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6">
          {questions.map((q) => {
            const answer = answerKeys.find(a => a.question_id === q.id)?.correct_answer;
            return <QuestionCard key={q.id} question={q} answer={answer} />;
          })}
        </section>
      </div>
    </main>
  );
}


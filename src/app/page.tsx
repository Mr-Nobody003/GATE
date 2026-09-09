import Link from "next/link";
import volume1 from "@/../data/volume1.json";

export default function Dashboard() {
  // Aggregate stats from volume1 (we can expand this for other volumes later)
  const totalQuestions = volume1.questions.length;
  const chapters = Array.from(new Set(volume1.questions.map(q => q.chapter)));
  
  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-50 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-white">GATE Practice Dashboard</h1>
          <p className="text-neutral-400">Track your progress across all volumes.</p>
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
            <h3 className="text-sm font-medium text-neutral-400">Total Questions</h3>
            <p className="text-3xl font-bold text-white mt-2">{totalQuestions}</p>
          </div>
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
            <h3 className="text-sm font-medium text-neutral-400">Volumes Available</h3>
            <p className="text-3xl font-bold text-white mt-2">1</p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Volume 1 Chapters</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {chapters.map((chapter) => (
              <Link 
                key={chapter}
                href={`/practice/volume1/${encodeURIComponent(chapter)}`}
                className="group p-6 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-all hover:bg-neutral-800/80 block"
              >
                <h3 className="font-medium text-lg text-white group-hover:text-blue-400 transition-colors">{chapter}</h3>
                <p className="text-sm text-neutral-400 mt-2">
                  {volume1.questions.filter(q => q.chapter === chapter).length} Questions
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

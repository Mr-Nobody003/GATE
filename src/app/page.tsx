import Link from "next/link";
import { getParsedData } from "@/lib/data";

export default function Dashboard() {
  const data = getParsedData();
  const volumes = Object.values(data.volumes);
  
  const totalQuestions = volumes.reduce((acc, vol) => acc + vol.questions.length, 0);
  
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
            <p className="text-3xl font-bold text-white mt-2">{volumes.length}</p>
          </div>
        </section>

        {volumes.map(vol => (
          <section key={vol.id} className="space-y-4">
            <h2 className="text-2xl font-semibold text-blue-400">{vol.name} Topics</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vol.topics.map((topic) => {
                const noteCount = vol.notes.filter(n => n.topicSlug === topic.slug).length;
                const questionCount = vol.questions.filter(q => q.topicSlug === topic.slug).length;
                
                return (
                  <Link 
                    key={topic.slug}
                    href={`/practice/${vol.id}/${topic.slug}`}
                    className="group p-6 rounded-xl border border-neutral-800 bg-neutral-900 hover:border-neutral-600 transition-all hover:bg-neutral-800/80 flex flex-col justify-between"
                  >
                    <h3 className="font-medium text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-2" title={topic.name}>{topic.name}</h3>
                    <div className="mt-4 flex gap-4 text-sm text-neutral-400 font-medium">
                      <span>{noteCount} Note(s)</span>
                      <span>{questionCount} PYQ(s)</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

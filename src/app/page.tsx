import Link from "next/link";
import { getParsedData } from "@/lib/data";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Dashboard() {
  const data = getParsedData();
  const volumes = Object.values(data.volumes);
  
  const totalQuestions = volumes.reduce(
    (acc, vol) => acc + vol.chapters.reduce((cAcc, chap) => cAcc + chap.questions.length, 0),
    0
  );
  
  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 p-4 sm:p-8 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex justify-between items-start">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white">GATE Practice Dashboard</h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">Track your progress across all volumes.</p>
          </div>
          <ThemeToggle />
        </header>

        <section className="grid gap-6 md:grid-cols-3">
          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Total Questions</h3>
            <p className="text-4xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{totalQuestions}</p>
          </div>
          <div className="p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 shadow-sm backdrop-blur-xl">
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Volumes Available</h3>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{volumes.length}</p>
          </div>
        </section>

        <section className="p-6 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/50 dark:bg-indigo-950/20 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Download Original PDFs</h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">Get the complete source material for offline viewing.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[1, 2, 3].map((vol) => (
              <a 
                key={vol}
                href={`/pdfs/filter1_volume${vol}.pdf`}
                download={`GATE_Volume_${vol}.pdf`}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all text-sm font-semibold text-neutral-700 dark:text-neutral-200 shadow-sm"
              >
                <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Vol {vol}
              </a>
            ))}
          </div>
        </section>

        {volumes.map(vol => (
          <section key={vol.id} className="space-y-6 pt-4">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
              <div className="w-2 h-6 bg-indigo-500 rounded-full" />
              {vol.name} <span className="font-medium text-neutral-500 dark:text-neutral-400">Chapters</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {vol.chapters.map((chapter) => {
                const noteCount = chapter.notes.length;
                const questionCount = chapter.questions.length;
                
                return (
                  <Link 
                    key={chapter.id}
                    href={`/practice/${vol.id}/${chapter.id}`}
                    className="group p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-bl-full -z-10 transition-transform group-hover:scale-125" />
                    <h3 className="font-bold text-lg text-neutral-800 dark:text-neutral-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2" title={chapter.name}>{chapter.name}</h3>
                    <div className="mt-6 flex gap-3">
                      <span className="text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-3 py-1.5 rounded-full">
                        {noteCount} Note(s)
                      </span>
                      <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-full">
                        {questionCount} PYQ(s)
                      </span>
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

import Link from "next/link";
import { getParsedData } from "@/lib/data";
import PracticeClient from "./PracticeClient";

export function generateStaticParams() {
  const data = getParsedData();
  const params: { volume: string; chapter: string }[] = [];
  
  for (const vol of Object.values(data.volumes)) {
    for (const chapter of vol.chapters) {
      params.push({
        volume: vol.id,
        chapter: chapter.id,
      });
    }
  }
  
  return params;
}

import ServerMarkdown from "@/components/ServerMarkdown";

export default async function PracticePage({
  params
}: {
  params: Promise<{ volume: string; chapter: string }>
}) {
  const resolvedParams = await params;
  const chapterId = decodeURIComponent(resolvedParams.chapter);
  
  const data = getParsedData();
  const volumeData = data.volumes[resolvedParams.volume];

  if (!volumeData) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Volume not found.</h1>
        <Link href="/" className="text-blue-400 mt-4 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const chapterData = volumeData.chapters.find(c => c.id === chapterId);
  
  if (!chapterData) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-50 p-8 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Chapter not found.</h1>
        <Link href="/" className="text-blue-400 mt-4 hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  const sidebarVolumes = Object.values(data.volumes).map(vol => ({
    id: vol.id,
    name: vol.name,
    chapters: vol.chapters.map(chap => {
      const topicsSet = new Set<string>();
      chap.questions.forEach(q => {
        if (q.topic) topicsSet.add(q.topic);
      });
      return {
        id: chap.id,
        name: chap.name,
        topics: Array.from(topicsSet)
      };
    })
  }));

  const enrichedNotes = chapterData.notes.map(note => ({
    ...note,
    contentHtml: <ServerMarkdown content={note.formattedContent} />
  }));

  const enrichedQuestions = chapterData.questions.map(q => ({
    ...q,
    questionHtml: <ServerMarkdown content={q.cleanText} />,
    optionsHtml: q.options ? q.options.map(opt => <ServerMarkdown content={opt} />) : null,
    solutionHtml: q.solution ? <ServerMarkdown content={q.solution} /> : null,
  }));

  const enrichedChapterData = {
    ...chapterData,
    notes: enrichedNotes,
    questions: enrichedQuestions
  };

  return (
    <PracticeClient 
      chapterData={enrichedChapterData as any} 
      volumeId={volumeData.id} 
      volumeName={volumeData.name}
      allVolumes={sidebarVolumes} 
    />
  );
}

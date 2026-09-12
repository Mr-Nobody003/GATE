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

  return (
    <PracticeClient 
      chapterData={chapterData} 
      volumeId={volumeData.id} 
      volumeName={volumeData.name}
      allVolumes={Object.values(data.volumes)} 
    />
  );
}

import Link from "next/link";
import { getParsedData } from "@/lib/data";
import PracticeClient from "./PracticeClient";

export function generateStaticParams() {
  const data = getParsedData();
  const params: { volume: string; chapter: string }[] = [];
  
  for (const vol of Object.values(data.volumes)) {
    for (const topic of vol.topics) {
      params.push({
        volume: vol.id,
        chapter: topic.slug, // Use slug for the folder name
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
  const chapterSlug = decodeURIComponent(resolvedParams.chapter);
  
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

  const topicObj = volumeData.topics.find(t => t.slug === chapterSlug);
  const chapterName = topicObj ? topicObj.name : chapterSlug;

  return <PracticeClient chapterName={chapterName} chapterSlug={chapterSlug} volumeData={volumeData} />;
}

import volume1Raw from "@/../data/filter1_volume1_structured.json";
import volume2Raw from "@/../data/filter1_volume2_structured.json";
import volume3Raw from "@/../data/filter1_volume3_structured.json";

export type RawEntry = {
  type: "note" | "question";
  topic: string;
  content?: string;
  question_text?: string;
  options?: string[] | null;
  answer?: string | null;
  solution?: string | null;
}

export type ParsedNote = {
  id: string;
  type: "note";
  topic: string;
  topicSlug: string;
  content: string;
}

export type ParsedQuestion = {
  id: string;
  type: "question";
  topic: string;
  topicSlug: string;
  question_text: string;
  options: string[] | null;
  answer: string | null;
  solution: string | null;
}

export type ParsedTopic = {
  name: string;
  slug: string;
}

export type ParsedVolume = {
  id: string;
  name: string;
  topics: ParsedTopic[];
  notes: ParsedNote[];
  questions: ParsedQuestion[];
}

export type ParsedData = {
  volumes: {
    [volumeId: string]: ParsedVolume;
  }
}

let cachedData: ParsedData | null = null;

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || "topic";
}

export function getParsedData(): ParsedData {
  if (cachedData) return cachedData;

  const data: ParsedData = { volumes: {} };
  
  const processVolume = (volId: string, name: string, raw: any[]) => {
    const topicMap = new Map<string, string>();
    const notes: ParsedNote[] = [];
    const questions: ParsedQuestion[] = [];
    
    let qIndex = 1;
    let nIndex = 1;
    
    for (const item of raw as RawEntry[]) {
      if (!item.topic) continue;
      // Skip empty notes
      if (item.type === "note" && !item.content?.trim()) continue;
      // Skip empty questions
      if (item.type === "question" && !item.question_text?.trim()) continue;
      
      let slug = topicMap.get(item.topic);
      if (!slug) {
        slug = slugify(item.topic);
        // Ensure unique slug
        let suffix = 1;
        let finalSlug = slug;
        while (Array.from(topicMap.values()).includes(finalSlug)) {
          finalSlug = `${slug}-${suffix++}`;
        }
        slug = finalSlug;
        topicMap.set(item.topic, slug);
      }
      
      if (item.type === "note") {
        notes.push({
          id: `${volId}-note-${nIndex++}`,
          type: "note",
          topic: item.topic,
          topicSlug: slug,
          content: item.content || ""
        });
      } else if (item.type === "question") {
        questions.push({
          id: `${volId}-q-${qIndex++}`,
          type: "question",
          topic: item.topic,
          topicSlug: slug,
          question_text: item.question_text || "",
          options: item.options || null,
          answer: item.answer || null,
          solution: item.solution || null
        });
      }
    }
    
    data.volumes[volId] = {
      id: volId,
      name,
      topics: Array.from(topicMap.entries()).map(([tName, tSlug]) => ({ name: tName, slug: tSlug })),
      notes,
      questions
    };
  };

  processVolume("volume1", "Volume 1", volume1Raw);
  processVolume("volume2", "Volume 2", volume2Raw);
  processVolume("volume3", "Volume 3", volume3Raw);
  
  cachedData = data;
  return data;
}

import allDataRaw from "@/../data/formatted_all.json";

export type ParsedNote = {
  id: string;
  type: "note";
  topic: string;
  topicSlug: string;
  content: string;
}

export type AnswerNAT = { low: number; high: number };

export type ParsedQuestion = {
  id: string;
  type: "question";
  qtype: "MCQ" | "MSQ" | "NAT" | "descriptive" | "unknown";
  topic: string;
  topicSlug: string;
  question_text: string;
  options: string[] | null;
  answer: string | string[] | AnswerNAT | null;
  solution: string | null;
}

export type ParsedTopic = {
  name: string;
  slug: string;
}

export type ParsedChapter = {
  id: string;
  name: string;
  topics: ParsedTopic[];
  notes: ParsedNote[];
  questions: ParsedQuestion[];
}

export type ParsedVolume = {
  id: string;
  name: string;
  chapters: ParsedChapter[];
}

export type ParsedData = {
  volumes: {
    [volumeId: string]: ParsedVolume;
  }
}

let cachedData: ParsedData | null = null;

export function getParsedData(): ParsedData {
  if (cachedData) return cachedData;
  cachedData = allDataRaw as ParsedData;
  return cachedData;
}

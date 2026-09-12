import allDataRaw from "@/../data/formatted_all.json";

export type ParsedNote = {
  id: string;
  type: "note";
  topic: string;
  topicSlug: string;
  content: string;
  /** `content` re-structured with real Markdown headings recovered from the
   *  plain-text section labels the source PDFs use (see structureNoteContent). */
  formattedContent: string;
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
  /** Real sub-topic name (e.g. "Balls In Bins") recovered from the question's
   *  own header line. Falls back to `topic` (e.g. "Topic 1.1") when it can't
   *  be confidently extracted. */
  displayTopic: string;
  /** The exam source line (e.g. "GATE CSE 1999 | Question: 1.3"), separated
   *  out so it can be shown as a small badge instead of leading text. Null
   *  when no header could be parsed. */
  examMeta: string | null;
  /** `question_text` with the leading "<label>: <exam info>" header line
   *  stripped out, so the rendered question doesn't repeat what's now in
   *  `displayTopic` / `examMeta`. Falls back to `question_text` untouched
   *  whenever stripping it would leave nothing meaningful. */
  cleanText: string;
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

// Raw shapes as they exist in data/formatted_all.json, before enrichment.
type RawQuestion = Omit<ParsedQuestion, "displayTopic" | "examMeta" | "cleanText">;
type RawNote = Omit<ParsedNote, "formattedContent">;
type RawChapter = Omit<ParsedChapter, "notes" | "questions"> & { notes: RawNote[]; questions: RawQuestion[] };
type RawVolume = Omit<ParsedVolume, "chapters"> & { chapters: RawChapter[] };
type RawData = { volumes: { [volumeId: string]: RawVolume } };

/**
 * The source PDFs prefix every question with a header line of the form
 * "<Subtopic Name>: GATE <branch> <year> | Question: <ref>" followed by a
 * blank line and the actual question. The chapter-level `topic` field is
 * just a placeholder ("Topic 1.1"), so the real subtopic name is recovered
 * from this header instead. Validated against the full dataset at ~99.9%
 * extraction (3806/3809 questions) with no false positives.
 */
function extractQuestionMeta(rawText: string, fallbackTopic: string): {
  displayTopic: string;
  examMeta: string | null;
  cleanText: string;
} {
  const idx = rawText.indexOf("\n\n");
  const header = idx === -1 ? rawText : rawText.slice(0, idx);
  const remainder = idx === -1 ? "" : rawText.slice(idx + 2).trim();

  const colonIdx = header.indexOf(":");
  const hasGate = header.includes("GATE");

  if (colonIdx > 0 && hasGate) {
    const label = header.slice(0, colonIdx).trim();
    const meta = header.slice(colonIdx + 1).trim();
    const validLabel = label.length >= 2 && label.length <= 60 && !label.includes("GATE") && !label.includes("\n");

    if (validLabel) {
      return {
        displayTopic: label,
        examMeta: meta.length > 0 ? meta : null,
        // Only strip the header from the visible text when there's a
        // meaningful amount of question left afterwards - a couple of
        // entries in the source data have no body at all after the header.
        cleanText: remainder.length > 10 ? remainder : rawText,
      };
    }
  }

  return { displayTopic: fallbackTopic, examMeta: null, cleanText: rawText };
}

const CONNECTOR_WORDS = new Set([
  "a", "an", "the", "of", "in", "on", "and", "or", "for", "to", "at", "by",
  "with", "is", "are", "per", "vs", "as", "from", "into", "over", "under", "&",
]);

/** True for short phrases like "Balls In Bins" or "Mark Distribution in Previous GATE" -
 *  every significant word capitalized, connector words ignored - which is how the
 *  real concept names in this dataset are written. Used to avoid promoting stray
 *  sentence fragments (which start with a lowercase word) into headings. */
function looksTitleCased(line: string): boolean {
  const words = line.match(/[A-Za-z][A-Za-z'-]*/g);
  if (!words || words.length === 0) return false;
  for (const w of words) {
    if (CONNECTOR_WORDS.has(w.toLowerCase())) continue;
    if (!/^[A-Z]/.test(w)) return false;
  }
  return true;
}

/** Lines that smell like they leaked in from an embedded example question
 *  (math, raw HTML, an exam citation, or an MCQ option) rather than being a
 *  genuine section heading. */
function looksLikeLeak(line: string): boolean {
  if (line.includes("$") || line.includes("<")) return true;
  if (line.includes("GATE") || line.includes("Question:")) return true;
  if (/^[A-Da-d][.)]\s/.test(line)) return true;
  return false;
}

function isFieldLabel(line: string): boolean {
  return (
    !line.includes("\n") &&
    line.length >= 4 &&
    line.length <= 80 &&
    line.endsWith(":") &&
    !looksLikeLeak(line)
  );
}

/**
 * The note text in the source PDFs has real structure (concept names, field
 * labels like "Definition and Core Idea:", numbered formula groups) but none
 * of it uses Markdown syntax - it's just short standalone lines. This
 * recovers that structure by classifying each blank-line-separated block and
 * re-emitting it as Markdown (##/###/#### headings, cleaned bullet lists),
 * so it renders with the same ReactMarkdown pipeline as everything else.
 * Validated across the full dataset (22 notes, ~7,800 blocks, ~1,870
 * recovered headings) with no meaningful misclassifications.
 */
function structureNoteContent(text: string): string {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);
  const out: string[] = [];

  for (const raw of blocks) {
    const stripped = raw.trim();
    if (!stripped) continue;

    if (stripped.startsWith("- ")) {
      // Some chapters format field labels as their own single-item bullet
      // (e.g. "- Properties/Identities:") rather than a standalone
      // paragraph - promote those to a heading too.
      const inner = stripped.replace(/^-\s*[•◦]?\s*/, "").trim();
      if (isFieldLabel(inner)) {
        out.push(`### ${inner}`);
        continue;
      }
      // Otherwise just drop the redundant "◦"/"•" glyph after the "-" -
      // Markdown already renders its own bullet marker.
      out.push(stripped.replace(/^-\s*[•◦]\s*/gm, "- "));
      continue;
    }

    if (stripped.startsWith("$$")) {
      out.push(stripped);
      continue;
    }

    const candidate = stripped.replace(/^[•◦]\s*/, "");
    if (!candidate.includes("\n") && candidate.length <= 80 && !looksLikeLeak(candidate)) {
      const numbered = candidate.match(/^(\d+)\.\s+(.{1,70}):$/);
      if (numbered && !looksLikeLeak(numbered[2]) && numbered[2].length >= 4) {
        out.push(`#### ${numbered[1]}. ${numbered[2]}`);
        continue;
      }
      if (!/[.?!]$/.test(candidate) && candidate.length >= 4) {
        if (candidate.endsWith(":")) {
          out.push(`### ${candidate}`);
          continue;
        }
        if (looksTitleCased(candidate)) {
          out.push(`## ${candidate}`);
          continue;
        }
      }
    }

    out.push(stripped);
  }

  return out.join("\n\n");
}

const SLUG_TOKEN_RE = /^[a-z][a-z0-9]*(-[a-z0-9&;]+)+\.?,?$/;

function isSlugHeavyLine(line: string): boolean {
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  const slugish = words.filter((w) => SLUG_TOKEN_RE.test(w)).length;
  return slugish / words.length > 0.5 && !/[.?!]$/.test(line.trim());
}

/**
 * Every note in the source data ends with a leftover appendix: a per-topic
 * PYQ index ("2.1 Cartesian Coordinates (1)"), GATE Overflow tag rows
 * ("gatecse-2015-set1 set-theory&amp;algebra ..."), and fragments of example
 * questions whose stems got cut off during extraction (so only orphaned
 * "- A. ... B. ..." option lists remain). This consistently starts 50-99%
 * of the way through the note (validated across all 22 chapter notes) and
 * is never useful study content, so it's dropped rather than rendered.
 */
function truncateNoteAppendix(text: string): string {
  const blocks = text.replace(/\r\n/g, "\n").trim().split(/\n\s*\n/);

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i].trim();
    if (!b) continue;
    if (/^(✍\s*)?Practice Tests?:/.test(b)) return blocks.slice(0, i).join("\n\n");
    if (/^\d+\.\d+(\s|$)/.test(b)) return blocks.slice(0, i).join("\n\n");
    if (isSlugHeavyLine(b)) return blocks.slice(0, i).join("\n\n");
  }
  return text;
}

function enrichQuestion(q: RawQuestion): ParsedQuestion {
  const { displayTopic, examMeta, cleanText } = extractQuestionMeta(q.question_text, q.topic);
  return { ...q, displayTopic, examMeta, cleanText };
}

function enrichNote(n: RawNote): ParsedNote {
  const trimmed = truncateNoteAppendix(n.content);
  return { ...n, formattedContent: structureNoteContent(trimmed) };
}

let cachedData: ParsedData | null = null;

export function getParsedData(): ParsedData {
  if (cachedData) return cachedData;

  const raw = allDataRaw as unknown as RawData;
  const volumes: ParsedData["volumes"] = {};

  for (const [volId, vol] of Object.entries(raw.volumes)) {
    volumes[volId] = {
      ...vol,
      chapters: vol.chapters.map((chapter) => ({
        ...chapter,
        notes: chapter.notes.map(enrichNote),
        questions: chapter.questions.map(enrichQuestion),
      })),
    };
  }

  cachedData = { volumes };
  return cachedData;
}

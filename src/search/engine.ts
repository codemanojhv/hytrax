import type { OKFDocument, OutcomeRecord, SearchResult } from '../knowledge/types.js';
import { loadKnowledge } from '../knowledge/loader.js';
import { loadOutcomes } from '../outcomes/reader.js';
import { getOutcomesFile } from '../utils/paths.js';

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,.-_/\\]+/)
    .filter(t => t.length > 0);
}

function tagMatches(token: string, tags: string[]): boolean {
  return tags.some(t => t.toLowerCase().includes(token) || token.includes(t.toLowerCase()));
}

function wordMatch(token: string, text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return lower === token || lower.startsWith(token + ' ') || lower.includes(' ' + token);
}

function anyWordMatch(tokens: string[], text: string): boolean {
  return tokens.some(t => wordMatch(t, text));
}

function anyTagMatch(tokens: string[], tags: string[]): boolean {
  return tokens.some(t => tagMatches(t, tags));
}

function filenameMatch(token: string, filePath: string): boolean {
  return filePath.toLowerCase().includes(token);
}

function anyFilenameMatch(tokens: string[], filePath: string): boolean {
  return tokens.some(t => filenameMatch(t, filePath));
}

type MatchPriority = 1 | 2 | 3 | 4;

interface KnowledgeMatch {
  doc: OKFDocument;
  priority: MatchPriority;
}

interface OutcomeMatch {
  record: OutcomeRecord;
  priority: MatchPriority;
}

function getKnowledgePriority(doc: OKFDocument, tokens: string[]): MatchPriority | null {
  // Priority 1: Tag match (strongest signal)
  if (anyTagMatch(tokens, doc.metadata.tags)) return 1;

  // Priority 2: Title match
  if (anyWordMatch(tokens, doc.metadata.title)) return 2;

  // Priority 3: Filename match
  if (anyFilenameMatch(tokens, doc.filePath)) return 3;

  // Priority 4: Description match (weakest signal)
  if (anyWordMatch(tokens, doc.metadata.description)) return 4;

  return null;
}

function getOutcomePriority(record: OutcomeRecord, tokens: string[]): MatchPriority | null {
  // Priority 1: Task description match
  if (anyWordMatch(tokens, record.task)) return 1;

  // Priority 2: Reason match
  if (record.reason && anyWordMatch(tokens, record.reason)) return 2;

  // Priority 3: Type or area match
  if ((record.type && anyWordMatch(tokens, record.type)) ||
      (record.area && anyWordMatch(tokens, record.area))) return 3;

  // Priority 4: ID match
  if (tokens.some(t => record.id.toLowerCase().includes(t))) return 4;

  return null;
}

export function search(
  hytraxRoot: string,
  query: string,
  opts?: {
    max?: number;
    includeKnowledge?: boolean;
    includeOutcomes?: boolean;
    filterType?: string;
  },
): SearchResult {
  const tokens = tokenize(query);
  const max = opts?.max ?? 10;
  const includeKnowledge = opts?.includeKnowledge ?? true;
  const includeOutcomes = opts?.includeOutcomes ?? true;
  const filterType = opts?.filterType;

  const result: SearchResult = { knowledge: [], outcomes: [] };

  if (includeKnowledge) {
    const allKnowledge = loadKnowledge(hytraxRoot);
    const filtered = filterType
      ? allKnowledge.filter(d => d.metadata.type === filterType)
      : allKnowledge;

    const matched: KnowledgeMatch[] = [];

    for (const doc of filtered) {
      const priority = getKnowledgePriority(doc, tokens);
      if (priority !== null) {
        matched.push({ doc, priority });
      }
    }

    // Sort by priority (1 = best), then by insertion order
    matched.sort((a, b) => a.priority - b.priority);
    result.knowledge = matched.slice(0, max).map(m => m.doc);
  }

  if (includeOutcomes) {
    const outcomesFile = getOutcomesFile(hytraxRoot);
    const allOutcomes = loadOutcomes(outcomesFile);

    const matched: OutcomeMatch[] = [];

    for (const record of allOutcomes) {
      const priority = getOutcomePriority(record, tokens);
      if (priority !== null) {
        matched.push({ record, priority });
      }
    }

    // Sort by priority (1 = best), then by insertion order
    matched.sort((a, b) => a.priority - b.priority);
    result.outcomes = matched.slice(0, max).map(m => m.record);
  }

  return result;
}

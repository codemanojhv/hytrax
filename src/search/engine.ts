import type { OKFDocument, OutcomeRecord, SearchResult } from '../knowledge/types.js';
import { loadKnowledge } from '../knowledge/loader.js';
import { loadOutcomes } from '../outcomes/reader.js';
import { getOutcomesFile } from '../utils/paths.js';

/**
 * Tokenize query string into lowercase tokens.
 */
function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s,.-_/\\]+/)
    .filter(t => t.length > 0);
}

/**
 * Check if a token matches a tag (exact or substring).
 */
function tagMatches(token: string, tags: string[]): boolean {
  return tags.some(t => t.toLowerCase().includes(token) || token.includes(t.toLowerCase()));
}

/**
 * Check if a token matches a string (word boundary).
 */
function wordMatches(token: string, text: string): boolean {
  const lower = text.toLowerCase();
  return lower === token || lower.startsWith(token + ' ') || lower.includes(' ' + token);
}

/**
 * Check if token matches filename.
 */
function filenameMatches(token: string, filePath: string): boolean {
  return filePath.toLowerCase().includes(token);
}

interface ScoredKnowledge {
  doc: OKFDocument;
  score: number;
}

interface ScoredOutcome {
  record: OutcomeRecord;
  score: number;
}

/**
 * Main search function. Deterministic tag/keyword matching.
 * Priority: tag > title > summary > filename
 */
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

    const scored: ScoredKnowledge[] = [];

    for (const doc of filtered) {
      let score = 0;

      for (const token of tokens) {
        // Tag match (highest priority)
        if (tagMatches(token, doc.metadata.tags)) score += 10;
        // Title match
        if (wordMatches(token, doc.metadata.title)) score += 7;
        // Summary match
        if (wordMatches(token, doc.metadata.summary)) score += 4;
        // Filename match
        if (filenameMatches(token, doc.filePath)) score += 3;
        // ID match
        if (doc.metadata.id.toLowerCase().includes(token)) score += 5;
      }

      if (score > 0) {
        scored.push({ doc, score });
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    result.knowledge = scored.slice(0, max).map(s => s.doc);
  }

  if (includeOutcomes) {
    const outcomesFile = getOutcomesFile(hytraxRoot);
    const allOutcomes = loadOutcomes(outcomesFile);

    const scored: ScoredOutcome[] = [];

    for (const record of allOutcomes) {
      let score = 0;

      for (const token of tokens) {
        // Task description match
        if (wordMatches(token, record.task)) score += 8;
        // Reason match
        if (record.reason && wordMatches(token, record.reason)) score += 5;
        // Type match
        if (record.type && record.type.toLowerCase().includes(token)) score += 3;
        // Area match
        if (record.area && record.area.toLowerCase().includes(token)) score += 3;
        // ID match
        if (record.id.toLowerCase().includes(token)) score += 2;
      }

      if (score > 0) {
        scored.push({ record, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    result.outcomes = scored.slice(0, max).map(s => s.record);
  }

  return result;
}

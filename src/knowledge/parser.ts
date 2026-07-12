import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { OKFDocument, OKFMetadata, OKFType, OKFStatus } from './types.js';

/**
 * Parse an .okf file (Markdown with YAML frontmatter).
 */
export function parseOKF(filePath: string): OKFDocument | null {
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Extract frontmatter between --- markers
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return null;

    const frontmatter = parseYamlBlock(match[1]);
    const body = (match[2] ?? '').trim();

    const metadata: OKFMetadata = {
      id: frontmatter.id ?? basename(filePath).replace('.okf', ''),
      type: (frontmatter.type as OKFType) ?? 'architecture',
      title: frontmatter.title ?? basename(filePath).replace('.okf', ''),
      summary: frontmatter.summary ?? '',
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      files: Array.isArray(frontmatter.files) ? frontmatter.files : [],
      status: (frontmatter.status as OKFStatus) ?? 'active',
    };

    return { metadata, body, filePath };
  } catch {
    return null;
  }
}

/**
 * Load all OKF files from a directory.
 */
export function loadAllOKF(knowledgeDir: string): OKFDocument[] {
  try {
    const files = readdirSync(knowledgeDir).filter(f => f.endsWith('.okf'));
    return files
      .map(f => parseOKF(join(knowledgeDir, f)))
      .filter((d): d is OKFDocument => d !== null);
  } catch {
    return [];
  }
}

/**
 * Simple YAML block parser (handles frontmatter only).
 */
function parseYamlBlock(block: string): Record<string, any> {
  const result: Record<string, any> = {};
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of block.split('\n')) {
    const trimmed = line.trim();

    // Array item
    if (trimmed.startsWith('- ')) {
      currentArray.push(trimmed.slice(2).trim());
      if (currentKey) {
        result[currentKey] = [...currentArray];
      }
      continue;
    }

    // Flush array if we hit a new key
    if (currentArray.length > 0 && currentKey && trimmed.includes(':')) {
      result[currentKey] = currentArray;
      currentArray = [];
      currentKey = null;
    }

    // Key: value
    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].replace(/^"|"$/g, '').trim();
      result[currentKey] = val || '';
      currentArray = [];
    }
  }

  // Flush remaining array
  if (currentArray.length > 0 && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

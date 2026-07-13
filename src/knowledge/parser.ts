import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import type { OKFDocument, OKFMetadata, OKFType, OKFStatus } from './types.js';

export function parseOKF(filePath: string): OKFDocument | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (!match) return null;

    const frontmatter = parseYamlBlock(match[1]);
    const body = (match[2] ?? '').trim();

    const baseName = basename(filePath).replace(/\.(md|okf)$/i, '');
    const metadata: OKFMetadata = {
      id: frontmatter.id ?? baseName,
      type: frontmatter.type ?? 'architecture',
      title: frontmatter.title ?? baseName,
      description: frontmatter.description ?? frontmatter.summary ?? '',
      resource: frontmatter.resource || undefined,
      tags: Array.isArray(frontmatter.tags) ? frontmatter.tags : [],
      files: Array.isArray(frontmatter.files) ? frontmatter.files : [],
      status: (frontmatter.status as OKFStatus) ?? 'active',
      timestamp: frontmatter.timestamp || undefined,
    };

    return { metadata, body, filePath };
  } catch {
    return null;
  }
}

/**
 * Recursively scan a directory for all knowledge files (.md or .okf).
 * .md is the standard OKF extension (Google OKF v0.1).
 * .okf is supported for backward compatibility with pre-v0.1 Hytrax files.
 */
function scanOKFFiles(dir: string): string[] {
  try {
    const entries = readdirSync(dir);
    const files: string[] = [];

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...scanOKFFiles(fullPath));
      } else if (entry.endsWith('.md') || entry.endsWith('.okf')) {
        files.push(fullPath);
      }
    }

    return files;
  } catch {
    return [];
  }
}

/**
 * Load all OKF files from a directory tree.
 */
export function loadAllOKF(knowledgeDir: string): OKFDocument[] {
  const files = scanOKFFiles(knowledgeDir);
  return files
    .map(f => parseOKF(f))
    .filter((d): d is OKFDocument => d !== null);
}

function parseYamlBlock(block: string): Record<string, any> {
  const result: Record<string, any> = {};
  let currentKey: string | null = null;
  let currentArray: string[] = [];

  for (const line of block.split('\n')) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ')) {
      currentArray.push(trimmed.slice(2).trim());
      if (currentKey) result[currentKey] = [...currentArray];
      continue;
    }

    if (currentArray.length > 0 && currentKey && trimmed.includes(':')) {
      result[currentKey] = currentArray;
      currentArray = [];
      currentKey = null;
    }

    const kvMatch = trimmed.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].replace(/^"|"$/g, '').trim();
      result[currentKey] = val || '';
      currentArray = [];
    }
  }

  if (currentArray.length > 0 && currentKey) {
    result[currentKey] = currentArray;
  }

  return result;
}

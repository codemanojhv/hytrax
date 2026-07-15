import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { parseYamlBlock } from '../knowledge/parser.js';
import type { HandoffRecord, HandoffStatus } from '../knowledge/types.js';
import { decodeText } from '../utils/text.js';

export function parseHandoffContent(content: string, filePath = '<input>'): HandoffRecord | null {
  const normalized = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return null;
  const fields = parseYamlBlock(match[1]);
  if (fields.type !== 'handoff') return null;
  const parsedId = String(fields.id || '');
  const id = parsedId || (filePath.startsWith('<') ? 'hnd-new' : basename(filePath).replace(/\.md$/i, ''));
  const status = String(fields.status || 'open') as HandoffStatus;
  return {
    id,
    type: 'handoff',
    status,
    sourceAgent: String(fields.source_agent || 'manual'),
    task: String(fields.task || fields.title || ''),
    parent: fields.parent ? String(fields.parent) : undefined,
    tags: Array.isArray(fields.tags) ? fields.tags.map(String) : [],
    files: Array.isArray(fields.files) ? fields.files.map(String) : [],
    createdAt: String(fields.created_at || fields.timestamp || ''),
    body: (match[2] || '').trim(),
    filePath,
  };
}

export function loadHandoffs(dir: string): HandoffRecord[] {
  try {
    const files: string[] = [];
    for (const entry of readdirSync(dir).sort()) {
      const filePath = join(dir, entry);
      if (statSync(filePath).isDirectory()) files.push(...collectHandoffFiles(filePath));
      else if (filePath.endsWith('.md')) files.push(filePath);
    }
    return files
      .map(filePath => parseHandoffContent(decodeText(readFileSync(filePath)), filePath))
      .filter((handoff): handoff is HandoffRecord => handoff !== null)
      .sort((a, b) => a.id.localeCompare(b.id));
  } catch {
    return [];
  }
}

export function listHandoffFiles(dir: string): string[] {
  try {
    const files: string[] = [];
    for (const entry of readdirSync(dir).sort()) {
      const filePath = join(dir, entry);
      if (statSync(filePath).isDirectory()) files.push(...collectHandoffFiles(filePath));
      else if (filePath.endsWith('.md')) files.push(filePath);
    }
    return files.sort();
  } catch {
    return [];
  }
}

function collectHandoffFiles(dir: string): string[] {
  try {
    return readdirSync(dir).sort().flatMap(entry => {
      const filePath = join(dir, entry);
      return statSync(filePath).isDirectory() ? collectHandoffFiles(filePath) : filePath.endsWith('.md') ? [filePath] : [];
    });
  } catch {
    return [];
  }
}

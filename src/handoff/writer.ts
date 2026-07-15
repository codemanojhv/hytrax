import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { getHandoffsDir } from '../utils/paths.js';
import type { HandoffRecord, HandoffStatus } from '../knowledge/types.js';
import { loadHandoffs, parseHandoffContent } from './parser.js';

function envelope(content: string, sourceAgent = 'external', task?: string): string {
  const inferredTask = task || content.match(/^#{1,6}\s+(.+)$/m)?.[1] || 'Continue previous work';
  return `---
id: hnd-new
type: handoff
status: open
source_agent: ${yamlScalar(sourceAgent)}
task: ${yamlScalar(inferredTask)}
created_at: ${new Date().toISOString()}
tags: []
files: []
---

${content}`;
}

function yamlScalar(value: string): string {
  return JSON.stringify(String(value).replace(/[\r\n]/g, ' ').trim());
}

function nextId(dir: string): string {
  const max = loadHandoffs(dir)
    .map(h => Number(h.id.match(/^hnd-(\d+)$/)?.[1] || 0))
    .reduce((a, b) => Math.max(a, b), 0);
  return `hnd-${String(max + 1).padStart(3, '0')}`;
}

export function validateHandoff(handoff: HandoffRecord, projectRoot?: string, strict = false): string[] {
  const errors: string[] = [];
  if (!/^hnd-[a-z0-9-]+$/i.test(handoff.id)) errors.push(`invalid id: ${handoff.id}`);
  if (!['open', 'completed', 'superseded'].includes(handoff.status)) errors.push(`invalid status: ${handoff.status}`);
  if (!handoff.task.trim()) errors.push('missing task');
  if (!handoff.sourceAgent.trim()) errors.push('missing source_agent');
  if (!handoff.createdAt.trim()) errors.push('missing created_at');
  if (!/^#{1,6}\s+(Goal|Objective|Current state|Summary|Task)\b/im.test(handoff.body)) errors.push('missing goal/current-state section');
  if (!/^#{1,6}\s+(Next actions|Next steps|Next session|Focus|What.?s next)\b/im.test(handoff.body)) errors.push('missing next-actions section');
  if (strict && projectRoot) {
    for (const file of handoff.files) {
      if (!file || file.includes('*')) continue;
      const resolved = resolve(projectRoot, file);
      const rel = relative(resolve(projectRoot), resolved);
      if (isAbsolute(file) || rel.startsWith('..') || rel === '..') errors.push(`linked file outside project: ${file}`);
      else if (!existsSync(resolved)) errors.push(`missing linked file: ${file}`);
    }
  }
  return errors;
}

export function createHandoff(hytraxRoot: string, content: string, defaults?: { sourceAgent?: string; task?: string }): HandoffRecord {
  const dir = getHandoffsDir(hytraxRoot);
  mkdirSync(dir, { recursive: true });
  const normalizedInput = parseHandoffContent(content) ? content : envelope(content, defaults?.sourceAgent, defaults?.task);
  const provisional = parseHandoffContent(normalizedInput);
  if (!provisional) throw new Error('Invalid handoff: expected YAML frontmatter with type: handoff.');
  const id = provisional.id === 'hnd-new' ? nextId(dir) : provisional.id;
  const normalized = normalizedInput.replace(/^id:\s*.*$/m, `id: ${yamlScalar(id)}`);
  const filePath = join(dir, `${id}.md`);
  if (existsSync(filePath)) throw new Error(`Handoff already exists: ${id}`);
  const handoff = parseHandoffContent(normalized, filePath);
  if (!handoff) throw new Error('Could not read handoff.');
  const errors = validateHandoff(handoff);
  if (errors.length) throw new Error(`Invalid handoff: ${errors.join('; ')}`);
  let fd: number;
  try { fd = openSync(filePath, 'wx'); } catch (error: any) {
    if (error?.code === 'EEXIST') throw new Error(`Handoff already exists: ${id}`);
    throw error;
  }
  try { writeFileSync(fd, normalized.endsWith('\n') ? normalized : `${normalized}\n`, 'utf8'); }
  finally { closeSync(fd); }
  return { ...handoff, filePath };
}

export function updateHandoffStatus(handoff: HandoffRecord, status: HandoffStatus): HandoffRecord {
  const content = readFileSync(handoff.filePath, 'utf8');
  writeFileSync(handoff.filePath, content.replace(/^status:\s*.*$/m, `status: ${status}`), 'utf8');
  return { ...handoff, status };
}

export function findHandoff(hytraxRoot: string, id: string): HandoffRecord | undefined {
  return loadHandoffs(getHandoffsDir(hytraxRoot)).find(handoff => handoff.id === id);
}

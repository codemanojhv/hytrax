import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getHandoffsDir } from '../utils/paths.js';
import type { HandoffRecord, HandoffStatus } from '../knowledge/types.js';
import { loadHandoffs, parseHandoffContent } from './parser.js';

function envelope(content: string, sourceAgent = 'external', task?: string): string {
  const inferredTask = task || content.match(/^#\s+(.+)$/m)?.[1] || 'Continue previous work';
  return `---
id: hnd-new
type: handoff
status: open
source_agent: ${sourceAgent}
task: "${inferredTask.replace(/"/g, '\\"')}"
created_at: ${new Date().toISOString()}
tags: []
files: []
---

${content}`;
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
  if (!/^#\s+(Goal|Objective|Current state|Summary|Task)\b/im.test(handoff.body)) errors.push('missing goal/current-state section');
  if (!/^#\s+(Next actions|Next steps|Next session|Focus|What.?s next)\b/im.test(handoff.body)) errors.push('missing next-actions section');
  if (strict && projectRoot) {
    for (const file of handoff.files) {
      if (file && !file.includes('*') && !existsSync(join(projectRoot, file))) errors.push(`missing linked file: ${file}`);
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
  const normalized = normalizedInput.replace(/^id:\s*.*$/m, `id: ${id}`);
  const filePath = join(dir, `${id}.md`);
  if (existsSync(filePath)) throw new Error(`Handoff already exists: ${id}`);
  writeFileSync(filePath, normalized.endsWith('\n') ? normalized : `${normalized}\n`, 'utf8');
  const handoff = parseHandoffContent(readFileSync(filePath, 'utf8'), filePath);
  if (!handoff) throw new Error('Could not read created handoff.');
  const errors = validateHandoff(handoff);
  if (errors.length) {
    writeFileSync(filePath, normalizedInput, 'utf8');
    throw new Error(`Invalid handoff: ${errors.join('; ')}`);
  }
  return handoff;
}

export function updateHandoffStatus(handoff: HandoffRecord, status: HandoffStatus): HandoffRecord {
  const content = readFileSync(handoff.filePath, 'utf8');
  writeFileSync(handoff.filePath, content.replace(/^status:\s*.*$/m, `status: ${status}`), 'utf8');
  return { ...handoff, status };
}

export function findHandoff(hytraxRoot: string, id: string): HandoffRecord | undefined {
  return loadHandoffs(getHandoffsDir(hytraxRoot)).find(handoff => handoff.id === id);
}

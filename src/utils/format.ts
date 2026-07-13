import type { OKFDocument, OutcomeRecord } from '../knowledge/types.js';

export function formatSearchYaml(results: { knowledge: OKFDocument[]; outcomes: OutcomeRecord[] }): string {
  const lines: string[] = [];

  if (results.knowledge.length > 0) {
    lines.push('knowledge:');
    for (const doc of results.knowledge) {
      lines.push(`  - id: ${doc.metadata.id}`);
      lines.push(`    type: ${doc.metadata.type}`);
      lines.push(`    title: ${doc.metadata.title}`);
      lines.push(`    description: ${doc.metadata.description}`);
      lines.push(`    tags: [${doc.metadata.tags.join(', ')}]`);
      lines.push(`    status: ${doc.metadata.status}`);
    }
  }

  if (results.outcomes.length > 0) {
    lines.push('outcomes:');
    for (const o of results.outcomes) {
      lines.push(`  - id: ${o.id}`);
      lines.push(`    task: ${o.task}`);
      lines.push(`    status: ${o.status}`);
      if (o.reason) lines.push(`    reason: ${o.reason}`);
    }
  }

  return lines.join('\n');
}

export function formatQueryTable(results: { knowledge: OKFDocument[]; outcomes: OutcomeRecord[] }): string {
  const lines: string[] = [];

  if (results.knowledge.length > 0) {
    lines.push('Knowledge:');
    lines.push('  ID        Type          Title                        Status   Tags');
    lines.push('  ────────────── ─────────────────────────── ────────── ─────────────');
    for (const doc of results.knowledge) {
      const id = doc.metadata.id.padEnd(10).slice(0, 10);
      const type = doc.metadata.type.padEnd(8).slice(0, 8);
      const title = doc.metadata.title.padEnd(28).slice(0, 28);
      const status = doc.metadata.status.padEnd(8).slice(0, 8);
      const tags = doc.metadata.tags.slice(0, 3).join(', ');
      lines.push(`  ${id} ${type} ${title} ${status} [${tags}]`);
    }
  }

  if (results.outcomes.length > 0) {
    if (results.knowledge.length > 0) lines.push('');
    lines.push('Outcomes:');
    lines.push('  ID        Status    Task');
    lines.push('  ────────────── ──────────────────────────────────────');
    for (const o of results.outcomes) {
      const id = o.id.padEnd(10).slice(0, 10);
      const status = o.status.padEnd(8).slice(0, 8);
      const task = o.task.length > 42 ? o.task.slice(0, 39) + '...' : o.task;
      lines.push(`  ${id} ${status} ${task}`);
    }
  }

  return lines.join('\n');
}

import type { HandoffRecord } from '../knowledge/types.js';
import { search } from '../search/engine.js';
import { getHandoffsDir } from '../utils/paths.js';
import { loadHandoffs } from './parser.js';

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
}

function handoffScore(handoff: HandoffRecord, taskTokens: string[]): number {
  const haystack = tokens([handoff.task, ...handoff.tags, ...handoff.files].join(' '));
  return taskTokens.filter(token => haystack.includes(token)).length;
}

function chooseHandoff(handoffs: HandoffRecord[], task: string, id?: string): HandoffRecord | undefined {
  if (id) return handoffs.find(handoff => handoff.id === id);
  const taskTokens = tokens(task);
  return handoffs
    .filter(handoff => handoff.status === 'open')
    .map(handoff => ({ handoff, score: handoffScore(handoff, taskTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || b.handoff.createdAt.localeCompare(a.handoff.createdAt) || a.handoff.id.localeCompare(b.handoff.id))[0]?.handoff;
}

function bullet(value: string): string {
  return `  - ${value.replace(/\r?\n/g, ' ')}`;
}

function renderHandoff(handoff: HandoffRecord, maxChars: number): string {
  const body = handoff.body.length > maxChars ? `${handoff.body.slice(0, maxChars)}\n[handoff body truncated]` : handoff.body;
  return [
    `handoff:`,
    `  id: ${handoff.id}`,
    `  source_agent: ${handoff.sourceAgent}`,
    `  status: ${handoff.status}`,
    `  task: ${handoff.task}`,
    `  body: |`,
    ...body.split('\n').map(line => `    ${line}`),
  ].join('\n');
}

export function renderResume(hytraxRoot: string, task: string, handoffId?: string, maxChars = 12000): string {
  const allHandoffs = loadHandoffs(getHandoffsDir(hytraxRoot));
  const handoff = chooseHandoff(allHandoffs, task, handoffId);
  const constraints = search(hytraxRoot, 'constraint', { max: 100, includeKnowledge: true, includeOutcomes: false, filterType: 'constraint' }).knowledge;
  const related = search(hytraxRoot, task, { max: 10, includeKnowledge: true, includeOutcomes: true });
  const knowledge = related.knowledge.filter(doc => doc.metadata.type !== 'constraint');
  const outcomes = related.outcomes.filter(outcome => outcome.status !== 'SUPERSEDED');
  const lines = [`task: ${task}`, 'context_truncated: false'];
  if (handoff) lines.push(renderHandoff(handoff, Math.max(1000, Math.floor(maxChars / 2))));
  if (constraints.length) {
    lines.push('active_constraints:', ...constraints.map(doc => bullet(`${doc.metadata.title}: ${doc.metadata.description}`)));
  }
  if (knowledge.length) {
    lines.push('relevant_knowledge:', ...knowledge.map(doc => bullet(`${doc.metadata.title} (${doc.metadata.type})`)));
  }
  if (outcomes.length) {
    lines.push('relevant_outcomes:', ...outcomes.map(outcome => bullet(`${outcome.status}: ${outcome.reason || outcome.task}`)));
  }
  lines.push('verify:', '  - build', '  - lint');
  let output = lines.join('\n');
  if (output.length <= maxChars) return output;
  const keep = lines.slice(0, handoff ? 3 : 2);
  keep.push('context_truncated: true', 'active_constraints:', ...constraints.map(doc => bullet(`${doc.metadata.title}: ${doc.metadata.description}`)), 'verify:', '  - build', '  - lint');
  output = keep.join('\n');
  return output.length <= maxChars ? output : `${output.slice(0, maxChars - 25)}\n[context truncated]`;
}

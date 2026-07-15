import type { HandoffRecord } from '../knowledge/types.js';
import { loadKnowledge } from '../knowledge/loader.js';
import { search } from '../search/engine.js';
import { getHandoffsDir } from '../utils/paths.js';
import { loadHandoffs } from './parser.js';

function tokens(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/).filter(token => token.length > 2);
}

function yaml(value: string): string {
  return JSON.stringify(String(value).replace(/[\r\n]/g, ' ').trim());
}

function handoffScore(handoff: HandoffRecord, taskTokens: string[]): number {
  const haystack = tokens([handoff.task, ...handoff.tags, ...handoff.files, handoff.body].join(' '));
  return taskTokens.filter(token => haystack.includes(token)).length;
}

function chooseHandoff(handoffs: HandoffRecord[], task: string, id?: string): HandoffRecord | undefined {
  if (id) return handoffs.find(handoff => handoff.id === id);
  const taskTokens = tokens(task);
  return handoffs
    .filter(handoff => handoff.status === 'open')
    .map(handoff => ({ handoff, score: handoffScore(handoff, taskTokens) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || Date.parse(b.handoff.createdAt) - Date.parse(a.handoff.createdAt) || a.handoff.id.localeCompare(b.handoff.id))[0]?.handoff;
}

function bullet(value: string): string {
  return `  - ${yaml(value)}`;
}

function renderHandoff(handoff: HandoffRecord, budget: number): string {
  const prefix = [
    'handoff:',
    `  id: ${yaml(handoff.id)}`,
    `  source_agent: ${yaml(handoff.sourceAgent)}`,
    `  status: ${yaml(handoff.status)}`,
    `  task: ${yaml(handoff.task)}`,
    '  body: |',
  ];
  const available = Math.max(0, budget - prefix.join('\n').length - 1);
  const bodyLines: string[] = [];
  let used = 0;
  for (const line of handoff.body.split('\n')) {
    const rendered = `    ${line}`;
    if (used + rendered.length + 1 > available) break;
    bodyLines.push(rendered);
    used += rendered.length + 1;
  }
  if (bodyLines.length < handoff.body.split('\n').length) bodyLines.push('    [handoff body truncated]');
  return [...prefix, ...bodyLines].join('\n');
}

function appendSection(lines: string[], section: string, maxChars: number): boolean {
  const candidate = [...lines, section].join('\n');
  if (candidate.length <= maxChars) {
    lines.push(section);
    return true;
  }
  return false;
}

export function renderResume(hytraxRoot: string, task: string, handoffId?: string, maxChars = 12000): string {
  if (!Number.isInteger(maxChars) || maxChars < 200) throw new Error('maxChars must be an integer of at least 200');
  const allHandoffs = loadHandoffs(getHandoffsDir(hytraxRoot));
  const handoff = chooseHandoff(allHandoffs, task, handoffId);
  if (handoffId && !handoff) throw new Error(`Unknown handoff: ${handoffId}`);

  const allKnowledge = loadKnowledge(hytraxRoot);
  const constraints = allKnowledge.filter(doc => doc.metadata.type === 'constraint' && doc.metadata.status === 'active');
  const related = search(hytraxRoot, task, { max: 10, includeKnowledge: true, includeOutcomes: true });
  const knowledge = related.knowledge.filter(doc => doc.metadata.type !== 'constraint');
  const outcomes = related.outcomes.filter(outcome => outcome.status !== 'SUPERSEDED');
  const lines = [`task: ${yaml(task)}`, 'context_truncated: false'];
  let truncated = false;

  if (handoff) {
    const handoffSection = renderHandoff(handoff, Math.floor(maxChars * 0.55));
    if (handoffSection.includes('[handoff body truncated]')) truncated = true;
    if (!appendSection(lines, handoffSection, maxChars)) truncated = true;
  }
  if (constraints.length) {
    const section = ['active_constraints:', ...constraints.map(doc => bullet(`${doc.metadata.title}: ${doc.metadata.description}`))].join('\n');
    if (!appendSection(lines, section, maxChars)) truncated = true;
  }
  if (knowledge.length) {
    const section = ['relevant_knowledge:', ...knowledge.map(doc => bullet(`${doc.metadata.title} (${doc.metadata.type})`))].join('\n');
    if (!appendSection(lines, section, maxChars)) truncated = true;
  }
  if (outcomes.length) {
    const section = ['relevant_outcomes:', ...outcomes.map(outcome => bullet(`${outcome.status}: ${outcome.reason || outcome.task}`))].join('\n');
    if (!appendSection(lines, section, maxChars)) truncated = true;
  }
  if (!appendSection(lines, ['verify:', '  - "build"', '  - "lint"'].join('\n'), maxChars)) truncated = true;

  if (truncated) {
    lines[1] = 'context_truncated: true';
    while (lines.join('\n').length > maxChars && lines.length > 2) lines.splice(lines.length - 2, 1);
  }
  return lines.join('\n');
}

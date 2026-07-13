import { appendFileSync, mkdirSync, existsSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { OutcomeRecord, OutcomeFacts, OutcomeStatus } from '../knowledge/types.js';

/**
 * Determine outcome from raw facts.
 */
export function determineOutcome(facts: OutcomeFacts): OutcomeStatus {
  if (facts.build === 'failed') return 'FAILED';
  if (facts.lint === 'failed') return 'FAILED';
  if (facts.build === 'passed' && facts.lint === 'passed') return 'ACCEPTED';
  if (facts.build === 'passed') return 'ACCEPTED';
  return 'FAILED';
}

/**
 * Tokenize a task string into meaningful words for overlap matching.
 */
function tokenizeTask(task: string): string[] {
  return task
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .filter(w => !['the', 'and', 'for', 'this', 'that', 'with', 'from', 'was'].includes(w));
}

/**
 * Calculate token overlap ratio between two strings.
 */
function tokenOverlap(a: string, b: string): number {
  const tokensA = tokenizeTask(a);
  const tokensB = tokenizeTask(b);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const overlap = tokensA.filter(t => tokensB.includes(t)).length;
  return overlap / Math.max(tokensA.length, tokensB.length);
}

/**
 * Read all existing outcome records from a JSONL file.
 */
function readAllOutcomes(outcomesFile: string): OutcomeRecord[] {
  try {
    const content = readFileSync(outcomesFile, 'utf-8').trim();
    if (!content) return [];
    return content
      .split('\n')
      .map(line => {
        try { return JSON.parse(line) as OutcomeRecord; } catch { return null; }
      })
      .filter((r): r is OutcomeRecord => r !== null);
  } catch {
    return [];
  }
}

/**
 * Supersede related FAILED/REJECTED outcomes when a new ACCEPTED outcome proves
 * a better approach. Rewrites the JSONL file with old records marked SUPERSEDED.
 */
function supersedeRelated(
  outcomesFile: string,
  newRecord: OutcomeRecord,
): void {
  if (newRecord.status !== 'ACCEPTED' && newRecord.status !== 'VERIFIED') return;
  if (!newRecord.task || newRecord.task === 'unknown task') return;

  const allOutcomes = readAllOutcomes(outcomesFile);
  let modified = false;

  const updated = allOutcomes.map(o => {
    if ((o.status === 'FAILED' || o.status === 'REJECTED') && o.id !== newRecord.id) {
      const overlap = tokenOverlap(o.task || '', newRecord.task || '');
      if (overlap >= 0.3) {
        modified = true;
        return { ...o, status: 'SUPERSEDED' as OutcomeStatus, reason: `Superseded by ${newRecord.id}: ${newRecord.task}` };
      }
    }
    return o;
  });

  if (modified) {
    const lines = updated.map(o => JSON.stringify(o)).join('\n') + '\n';
    writeFileSync(outcomesFile, lines, 'utf-8');
  }
}

/**
 * Read existing outcomes to determine the next available ID.
 */
function nextOutcomeId(outcomesFile: string): number {
  try {
    const allOutcomes = readAllOutcomes(outcomesFile);
    if (allOutcomes.length === 0) return 1;
    const last = allOutcomes[allOutcomes.length - 1];
    const num = parseInt((last.id ?? 'out-000').replace('out-', ''), 10);
    return isNaN(num) ? 1 : num + 1;
  } catch {
    return 1;
  }
}

/**
 * Append an outcome to outcomes.jsonl.
 * When an ACCEPTED outcome is recorded, related FAILED/REJECTED outcomes
 * are automatically marked SUPERSEDED (token overlap >= 30%).
 */
export function writeOutcome(
  outcomesFile: string,
  facts: OutcomeFacts,
): OutcomeRecord {
  const dir = dirname(outcomesFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  if (!existsSync(outcomesFile)) {
    writeFileSync(outcomesFile, '', 'utf-8');
  }

  const status = determineOutcome(facts);
  const nextId = nextOutcomeId(outcomesFile);

  const record: OutcomeRecord = {
    id: `out-${String(nextId).padStart(3, '0')}`,
    task: facts.task ?? 'unknown task',
    status,
    reason: facts['user-feedback'] || (status === 'FAILED' ? 'Verification failed' : undefined),
    files: facts.files ?? [],
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    verification: {
      build: facts.build === 'passed',
      lint: facts.lint === 'passed',
      tests: facts.tests ?? 0,
    },
  };

  if (facts.approach) record.approach = facts.approach;

  appendFileSync(outcomesFile, JSON.stringify(record) + '\n', 'utf-8');

  // P4: Auto-supersede related failures when an approach succeeds
  supersedeRelated(outcomesFile, record);

  return record;
}

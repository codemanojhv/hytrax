import { appendFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { OutcomeRecord, OutcomeFacts, OutcomeStatus } from '../knowledge/types.js';

/**
 * Determine outcome from raw facts.
 */
export function determineOutcome(facts: OutcomeFacts): OutcomeStatus {
  if (facts.build === 'failed') return 'FAILED';
  if (facts.lint === 'failed') return 'FAILED';
  if (facts.build === 'passed' && facts.lint === 'passed') return 'ACCEPTED';
  if (facts.build === 'passed') return 'ACCEPTED'; // no lint data — assume accepted
  return 'FAILED';
}

/**
 * Append an outcome to outcomes.jsonl.
 */
export function writeOutcome(
  outcomesFile: string,
  facts: OutcomeFacts,
): OutcomeRecord {
  const dir = dirname(outcomesFile);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  // Ensure file exists
  if (!existsSync(outcomesFile)) {
    writeFileSync(outcomesFile, '', 'utf-8');
  }

  const status = determineOutcome(facts);

  // Read existing to get next ID
  let nextId = 1;
  try {
    const content = require('node:fs').readFileSync(outcomesFile, 'utf-8').trim();
    if (content) {
      const lines = content.split('\n');
      const lastLine = lines[lines.length - 1];
      if (lastLine) {
        const last = JSON.parse(lastLine);
        const num = parseInt((last.id ?? 'out-000').replace('out-', ''), 10);
        nextId = isNaN(num) ? 1 : num + 1;
      }
    }
  } catch {
    nextId = 1;
  }

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
  return record;
}

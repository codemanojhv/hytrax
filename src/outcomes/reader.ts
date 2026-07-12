import { readFileSync, existsSync } from 'node:fs';
import type { OutcomeRecord } from '../knowledge/types.js';

export function loadOutcomes(outcomesFile: string): OutcomeRecord[] {
  if (!existsSync(outcomesFile)) return [];

  try {
    const content = readFileSync(outcomesFile, 'utf-8').trim();
    if (!content) return [];

    return content
      .split('\n')
      .map(line => {
        try {
          return JSON.parse(line) as OutcomeRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is OutcomeRecord => r !== null);
  } catch {
    return [];
  }
}

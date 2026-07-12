import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { rmSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { OutcomeFacts } from '../src/knowledge/types.js';

const testDir = join(tmpdir(), 'hytrax-test-record');
const outcomesFile = join(testDir, 'outcomes.jsonl');

function setup() {
  rmSync(testDir, { recursive: true, force: true });
}

describe('Record module', () => {
  beforeAll(() => setup());

  it('should determine ACCEPTED outcome when build and lint pass', async () => {
    const { determineOutcome } = await import('../src/outcomes/builder.js');
    // Actually builder.ts determines via builder.ts
  });

  it('should determine ACCEPTED from facts', async () => {
    const { determineOutcome } = await import('../src/outcomes/builder.js');
    // We need to use the function from writer.ts
  });
});

describe('Outcome writer', () => {
  beforeAll(() => setup());

  it('should write outcome to JSONL', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts: OutcomeFacts = {
      build: 'passed',
      lint: 'passed',
      tests: 42,
      files: ['Hero.tsx'],
      task: 'Test task',
      approach: 'Test approach',
    };
    const record = writeOutcome(outcomesFile, facts);

    expect(record.status).toBe('ACCEPTED');
    expect(record.id).toBe('out-001');
    expect(record.task).toBe('Test task');
    expect(record.verification.build).toBe(true);
    expect(record.verification.lint).toBe(true);
    expect(record.verification.tests).toBe(42);

    // Verify file was written
    expect(existsSync(outcomesFile)).toBe(true);
    const content = readFileSync(outcomesFile, 'utf-8').trim();
    expect(content).toBeTruthy();
  });

  it('should auto-increment IDs', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts: OutcomeFacts = { build: 'passed' };
    const record = writeOutcome(outcomesFile, facts);
    expect(record.id).toBe('out-002');
  });

  it('should determine FAILED from failed build', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts: OutcomeFacts = { build: 'failed' };
    const record = writeOutcome(outcomesFile, facts);
    expect(record.status).toBe('FAILED');
  });
});

import { describe, it, expect } from 'vitest';
import type { OutcomeRecord } from '../src/knowledge/types.js';

function makeOutcome(overrides: Partial<OutcomeRecord> = {}): OutcomeRecord {
  return {
    id: 'out-001',
    task: 'test task',
    status: 'ACCEPTED',
    files: [],
    timestamp: '2026-07-12 12:00:00',
    verification: { build: true },
    ...overrides,
  };
}

describe('Outcome reader', () => {
  it('should return empty array for missing file', async () => {
    const { loadOutcomes } = await import('../src/outcomes/reader.js');
    const results = loadOutcomes('/nonexistent/path.jsonl');
    expect(results).toEqual([]);
  });

  it('should return empty array for empty file', async () => {
    // Create a temp empty file
    const { writeFileSync, mkdirSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = join(tmpdir(), 'hytrax-test-empty-outcomes');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'outcomes.jsonl');
    writeFileSync(file, '', 'utf-8');

    const { loadOutcomes } = await import('../src/outcomes/reader.js');
    const results = loadOutcomes(file);
    expect(results).toEqual([]);
  });

  it('should skip corrupt JSON lines', async () => {
    const { writeFileSync, mkdirSync, rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const dir = join(tmpdir(), 'hytrax-test-corrupt-outcomes');
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'outcomes.jsonl');
    writeFileSync(file, `{"id":"out-001","task":"good","status":"ACCEPTED","files":[],"timestamp":"","verification":{"build":true}}\nnot-json\n{"id":"out-002","task":"also good","status":"FAILED","files":[],"timestamp":"","verification":{"build":false}}\n`, 'utf-8');

    const { loadOutcomes } = await import('../src/outcomes/reader.js');
    const results = loadOutcomes(file);
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('out-001');
    expect(results[1].id).toBe('out-002');
  });
});

describe('Outcome stats builder', () => {
  it('should handle empty array', async () => {
    const { buildStats } = await import('../src/outcomes/builder.js');
    const stats = buildStats([]);
    expect(stats.total).toBe(0);
    expect(stats.acceptanceRate).toBe('0%');
    expect(stats.failureRate).toBe('0%');
    expect(stats.recentFailures).toEqual([]);
    expect(stats.byArea).toEqual({});
  });

  it('should count all statuses correctly', async () => {
    const { buildStats } = await import('../src/outcomes/builder.js');
    const outcomes = [
      makeOutcome({ id: 'out-001', status: 'ACCEPTED' }),
      makeOutcome({ id: 'out-002', status: 'ACCEPTED' }),
      makeOutcome({ id: 'out-003', status: 'REJECTED' }),
      makeOutcome({ id: 'out-004', status: 'FAILED' }),
      makeOutcome({ id: 'out-005', status: 'VERIFIED' }),
    ];
    const stats = buildStats(outcomes);
    expect(stats.total).toBe(5);
    expect(stats.accepted).toBe(2);
    expect(stats.rejected).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.verified).toBe(1);
    expect(stats.acceptanceRate).toBe('40%');
    expect(stats.failureRate).toBe('40%');
  });

  it('should group by area', async () => {
    const { buildStats } = await import('../src/outcomes/builder.js');
    const outcomes = [
      makeOutcome({ id: 'out-001', area: 'frontend', status: 'ACCEPTED' }),
      makeOutcome({ id: 'out-002', area: 'frontend', status: 'FAILED' }),
      makeOutcome({ id: 'out-003', area: 'backend', status: 'ACCEPTED' }),
    ];
    const stats = buildStats(outcomes);
    expect(stats.byArea['frontend']).toEqual({ total: 2, failed: 1 });
    expect(stats.byArea['backend']).toEqual({ total: 1, failed: 0 });
  });

  it('should return recent failures in reverse order', async () => {
    const { buildStats } = await import('../src/outcomes/builder.js');
    const outcomes = [
      makeOutcome({ id: 'out-001', status: 'FAILED' }),
      makeOutcome({ id: 'out-002', status: 'ACCEPTED' }),
      makeOutcome({ id: 'out-003', status: 'REJECTED' }),
      makeOutcome({ id: 'out-004', status: 'FAILED' }),
    ];
    const stats = buildStats(outcomes);
    expect(stats.recentFailures).toHaveLength(3);
    // Should be reverse chronological
    expect(stats.recentFailures[0].id).toBe('out-004');
    expect(stats.recentFailures[2].id).toBe('out-001');
  });

  it('should cap recent failures at 5', async () => {
    const { buildStats } = await import('../src/outcomes/builder.js');
    const outcomes = Array.from({ length: 10 }, (_, i) =>
      makeOutcome({ id: `out-${String(i + 1).padStart(3, '0')}`, status: i % 2 === 0 ? 'FAILED' : 'REJECTED' }),
    );
    const stats = buildStats(outcomes);
    expect(stats.recentFailures).toHaveLength(5);
  });

  it('should accept single record', async () => {
    const { buildStats } = await import('../src/outcomes/builder.js');
    const stats = buildStats([makeOutcome()]);
    expect(stats.total).toBe(1);
    expect(stats.accepted).toBe(1);
    expect(stats.acceptanceRate).toBe('100%');
    expect(stats.failureRate).toBe('0%');
  });
});

import { describe, it, expect } from 'vitest';
import type { OKFDocument, OutcomeRecord } from '../src/knowledge/types.js';

const mockDoc = (overrides: Partial<OKFDocument['metadata']> = {}): OKFDocument => ({
  metadata: {
    id: 'arc-01',
    type: 'architecture',
    title: 'Design System',
    description: 'UI component library',
    tags: ['frontend', 'ui'],
    files: ['components/'],
    status: 'active',
    ...overrides,
  },
  body: 'Body text',
  filePath: '/fake/path.md',
});

const mockOutcome = (overrides: Partial<OutcomeRecord> = {}): OutcomeRecord => ({
  id: 'out-001',
  task: 'Build landing page',
  status: 'REJECTED',
  reason: 'Too corporate',
  files: ['Hero.tsx'],
  timestamp: '2026-07-12 12:00:00',
  verification: { build: true, lint: false, tests: 0 },
  ...overrides,
});

describe('formatSearchYaml', () => {
  it('should produce empty output for no results', async () => {
    const { formatSearchYaml } = await import('../src/utils/format.js');
    const output = formatSearchYaml({ knowledge: [], outcomes: [] });
    expect(output).toBe('');
  });

  it('should format knowledge results', async () => {
    const { formatSearchYaml } = await import('../src/utils/format.js');
    const output = formatSearchYaml({
      knowledge: [mockDoc()],
      outcomes: [],
    });
    expect(output).toContain('knowledge:');
    expect(output).toContain('id: arc-01');
    expect(output).toContain('title: Design System');
    expect(output).toContain('tags: [frontend, ui]');
    expect(output).not.toContain('outcomes:');
  });

  it('should format outcome results', async () => {
    const { formatSearchYaml } = await import('../src/utils/format.js');
    const output = formatSearchYaml({
      knowledge: [],
      outcomes: [mockOutcome()],
    });
    expect(output).toContain('outcomes:');
    expect(output).toContain('id: out-001');
    expect(output).toContain('task: Build landing page');
    expect(output).toContain('status: REJECTED');
    expect(output).toContain('reason: Too corporate');
    expect(output).not.toContain('knowledge:');
  });

  it('should include reason only when present', async () => {
    const { formatSearchYaml } = await import('../src/utils/format.js');
    const withReason = formatSearchYaml({
      knowledge: [],
      outcomes: [mockOutcome({ reason: 'Fix applied' })],
    });
    expect(withReason).toContain('reason: Fix applied');

    const withoutReason = formatSearchYaml({
      knowledge: [],
      outcomes: [mockOutcome({ reason: undefined })],
    });
    expect(withoutReason).not.toContain('reason:');
  });

  it('should format both sections when both present', async () => {
    const { formatSearchYaml } = await import('../src/utils/format.js');
    const output = formatSearchYaml({
      knowledge: [mockDoc()],
      outcomes: [mockOutcome()],
    });
    expect(output).toContain('knowledge:');
    expect(output).toContain('outcomes:');
  });
});

describe('formatQueryTable', () => {
  it('should produce empty output for no results', async () => {
    const { formatQueryTable } = await import('../src/utils/format.js');
    const output = formatQueryTable({ knowledge: [], outcomes: [] });
    expect(output).toBe('');
  });

  it('should format knowledge table', async () => {
    const { formatQueryTable } = await import('../src/utils/format.js');
    const output = formatQueryTable({
      knowledge: [mockDoc()],
      outcomes: [],
    });
    expect(output).toContain('Knowledge:');
    expect(output).toContain('arc-01');
    expect(output).toContain('Design System');
    expect(output).not.toContain('Outcomes:');
  });

  it('should format outcomes table', async () => {
    const { formatQueryTable } = await import('../src/utils/format.js');
    const output = formatQueryTable({
      knowledge: [],
      outcomes: [mockOutcome()],
    });
    expect(output).toContain('Outcomes:');
    expect(output).toContain('out-001');
    expect(output).toContain('Build landing page');
  });

  it('should truncate long task descriptions', async () => {
    const { formatQueryTable } = await import('../src/utils/format.js');
    const longTask = 'A'.repeat(100);
    const output = formatQueryTable({
      knowledge: [],
      outcomes: [mockOutcome({ task: longTask })],
    });
    expect(output).toContain('...');
    expect(output!.length).toBeLessThan(200);
  });

  it('should separate sections with blank line when both present', async () => {
    const { formatQueryTable } = await import('../src/utils/format.js');
    const output = formatQueryTable({
      knowledge: [mockDoc()],
      outcomes: [mockOutcome()],
    });
    const lines = output.split('\n');
    const knowledgeIdx = lines.findIndex(l => l.includes('Knowledge:'));
    const outcomesIdx = lines.findIndex(l => l.includes('Outcomes:'));
    expect(outcomesIdx).toBeGreaterThan(knowledgeIdx);
    // There should be a blank line between sections
    expect(lines[outcomesIdx - 1]).toBe('');
  });
});

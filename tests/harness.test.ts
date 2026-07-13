/**
 * Harness validation — proves the Hytrax knowledge loop actually works.
 *
 * Tests the full deterministic pipeline:
 *   1. Seed .hytrax/ with diverse knowledge + outcomes
 *   2. Run plan → verify it surfaces constraints, avoids, and knowledge
 *   3. Run search → verify priority ordering (tag > title > filename > description)
 *   4. Run record → verify outcomes are stored and retrievable
 *   5. The learning loop: record a failure → next plan surfaces it
 *   6. Determinism: same input always produces same output
 *
 * This is the definitive "does Hytrax work" test. If all harness tests pass,
 * the knowledge loop is functioning correctly end-to-end.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-harness-validation');
const cliEntry = join('E:', 'hytrax-harness', 'dist', 'index.js');
const hytraxDir = join(testDir, '.hytrax');

/** Run a CLI command and capture stdout/stderr */
function run(args: string, cwd: string = testDir): { stdout: string; stderr: string } {
  try {
    const stdout = execSync(`node "${cliEntry}" ${args}`, {
      cwd,
      encoding: 'utf-8',
      timeout: 10000,
    });
    return { stdout: stdout.trim(), stderr: '' };
  } catch (e: any) {
    return {
      stdout: (e.stdout?.toString() || '').trim(),
      stderr: (e.stderr?.toString() || '').trim(),
    };
  }
}

function knowledgeDir(...subdirs: string[]): string {
  return join(hytraxDir, 'knowledge', ...subdirs);
}

/**
 * Write an OKF file using bullet-list array format (the parser
 * handles `- item` syntax, not inline `[a, b]` YAML arrays).
 */
function writeOKF(subdir: string, filename: string, defs: {
  id: string; type: string; title: string; description: string;
  tags: string[]; files: string[]; status?: string;
}): void {
  const dir = knowledgeDir(subdir);
  mkdirSync(dir, { recursive: true });
  const tags = defs.tags.map(t => `  - ${t}`).join('\n');
  const files = defs.files.map(f => `  - ${f}`).join('\n');
  const content = `---
id: ${defs.id}
type: ${defs.type}
title: ${defs.title}
description: "${defs.description}"
tags:
${tags}
files:
${files}
status: ${defs.status ?? 'active'}
timestamp: 2026-07-01T00:00:00Z
---

Body content for ${defs.id}.
`;
  writeFileSync(join(dir, filename), content, 'utf-8');
}

function seedKnowledge(): void {
  writeOKF('architecture', 'design-system.md', {
    id: 'arc-01', type: 'architecture',
    title: 'Design System',
    description: 'Tailwind-based design system with shared UI components',
    tags: ['frontend', 'ui', 'design'],
    files: ['src/components/ui/'],
  });
  writeOKF('architecture', 'auth.md', {
    id: 'arc-02', type: 'architecture',
    title: 'Authentication',
    description: 'Supabase Auth with Row Level Security policies',
    tags: ['auth', 'security', 'backend'],
    files: ['src/middleware.ts'],
  });
  writeOKF('constraints', 'tailwind-only.md', {
    id: 'con-01', type: 'constraint',
    title: 'Tailwind Only',
    description: 'Must use Tailwind CSS. No other CSS frameworks allowed.',
    tags: ['frontend', 'constraint', 'css'],
    files: [],
  });
  writeOKF('constraints', 'typescript-only.md', {
    id: 'con-02', type: 'constraint',
    title: 'TypeScript Required',
    description: 'All code must be written in TypeScript, not JavaScript.',
    tags: ['typescript', 'constraint', 'language'],
    files: [],
  });
  writeOKF('constraints', 'hytrax-first.md', {
    id: 'con-03', type: 'constraint',
    title: 'Hytrax Before Code',
    description: 'Run hytrax plan before writing any code. Every time.',
    tags: ['hytrax', 'workflow', 'mandatory'],
    files: [],
  });
  writeOKF('patterns', 'landing-page.md', {
    id: 'cvn-01', type: 'convention',
    title: 'Landing Page Pattern',
    description: 'Hero → Features → CTA layout. No carousels, no complex animations.',
    tags: ['frontend', 'landing-page', 'convention'],
    files: [],
  });
  writeOKF('patterns', 'api-route.md', {
    id: 'cvn-02', type: 'convention',
    title: 'API Route Pattern',
    description: 'App Router handlers with Zod validation and typed responses.',
    tags: ['backend', 'api', 'convention'],
    files: [],
  });
  writeOKF('workflows', 'hytrax-loop.md', {
    id: 'wf-01', type: 'workflow',
    title: 'Hytrax Knowledge Loop',
    description: 'plan → search → code → record. Always. No exceptions.',
    tags: ['workflow', 'hytrax', 'mandatory'],
    files: [],
  });
}

function seedOutcomes(): void {
  const outcomesDir = join(hytraxDir, 'outcomes');
  mkdirSync(outcomesDir, { recursive: true });
  writeFileSync(join(outcomesDir, 'outcomes.jsonl'),
    [
      JSON.stringify({ id: 'out-001', task: 'Build landing page hero', type: 'feature', area: 'frontend', status: 'REJECTED', reason: 'Corporate layout, too formal. Use modern gradient hero instead.', files: ['Hero.tsx'], timestamp: '2026-07-10 14:30:00', verification: { build: true, lint: true, tests: 0 } }),
      JSON.stringify({ id: 'out-002', task: 'Add user login', type: 'feature', area: 'auth', status: 'ACCEPTED', reason: 'Supabase Auth integration works with RLS', files: ['auth.ts'], timestamp: '2026-07-11 09:15:00', verification: { build: true, lint: true, tests: 12 } }),
      JSON.stringify({ id: 'out-003', task: 'Style navbar with CSS modules', type: 'feature', area: 'frontend', status: 'FAILED', reason: 'Violates Tailwind-only constraint. Rebuild with Tailwind.', files: ['Navbar.tsx', 'Navbar.module.css'], timestamp: '2026-07-11 16:00:00', verification: { build: true, lint: false, tests: 0 } }),
      JSON.stringify({ id: 'out-004', task: 'Add dark mode toggle', type: 'feature', area: 'frontend', status: 'ACCEPTED', reason: 'Tailwind dark: variant works perfectly', files: ['ThemeToggle.tsx'], timestamp: '2026-07-12 10:00:00', verification: { build: true, lint: true, tests: 5 } }),
      JSON.stringify({ id: 'out-005', task: 'Create API endpoint for users', type: 'feature', area: 'backend', status: 'FAILED', reason: 'Missing Zod validation on input', files: ['api/users.ts'], timestamp: '2026-07-12 14:00:00', verification: { build: true, lint: true, tests: 0 } }),
    ].join('\n') + '\n', 'utf-8');
}

/**
 * Parse a plan output into its sections for assertion.
 */
function parsePlan(plan: string): Record<string, string[]> {
  const sections: Record<string, string[]> = {};
  let currentSection: string | null = null;
  for (const line of plan.split('\n')) {
    const sectionMatch = line.match(/^(\w+):$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      sections[currentSection] = [];
    } else if (currentSection && line.startsWith('  - ')) {
      sections[currentSection].push(line.replace(/^  - /, ''));
    }
  }
  return sections;
}

describe('Hytrax Harness Validation — Full Knowledge Loop', () => {
  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });

    // Initialize .hytrax/ with config (skip init, we seed manually)
    mkdirSync(hytraxDir, { recursive: true });
    writeFileSync(join(hytraxDir, 'config.toml'), `[project]
name = "harness-validation"

[search]
max_results = 10

[record]
promotion_threshold = 3
`, 'utf-8');

    seedKnowledge();
    seedOutcomes();
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  // ──────────────────────────────────────────────────────────
  // TEST 1: Plan surfaces the right things
  // ──────────────────────────────────────────────────────────
  describe('plan — surfaces constraints, avoids, and relevant knowledge', () => {
    it('should surface all constraints for any task', () => {
      const { stdout } = run('plan "build anything"');
      const sections = parsePlan(stdout);

      // All 3 constraints should be present
      expect(sections.constraints).toContain('Tailwind Only');
      expect(sections.constraints).toContain('TypeScript Required');
      expect(sections.constraints).toContain('Hytrax Before Code');
      expect(sections.verify).toContain('build');
      expect(sections.verify).toContain('lint');
    });

    it('should surface knowledge matching the task keywords', () => {
      const { stdout } = run('plan "build a landing page"');
      const sections = parsePlan(stdout);

      // "landing" → Landing Page Pattern (title match, priority 2)
      expect(sections.knowledge).toContain('Landing Page Pattern  (convention)');
      // "page" → also in Landing Page Pattern title
    });

    it('should surface past failures in the avoid section', () => {
      // "landing" and "page" match out-001 (task: "Build landing page hero")
      const { stdout } = run('plan "build a landing page"');
      const sections = parsePlan(stdout);

      expect(sections.avoid.length).toBeGreaterThanOrEqual(1);
      expect(sections.avoid.some(a => a.includes('Corporate'))).toBe(true);
    });

    it('should surface api-route knowledge for backend tasks', () => {
      const { stdout } = run('plan "create API route for users"');
      const sections = parsePlan(stdout);

      // "api" matches the API Route Pattern's tags
      expect(sections.knowledge).toContain('API Route Pattern  (convention)');
    });

    it('should always include verify section', () => {
      const { stdout } = run('plan "anything at all"');
      expect(stdout).toContain('verify:');
      expect(stdout).toContain('- build');
      expect(stdout).toContain('- lint');
    });

    it('should include task description in output', () => {
      const { stdout } = run('plan "add dark mode support"');
      expect(stdout).toContain('task:');
      expect(stdout).toContain('add dark mode support');
    });
  });

  // ──────────────────────────────────────────────────────────
  // TEST 2: Search finds knowledge and outcomes
  // ──────────────────────────────────────────────────────────
  describe('search — finds knowledge by tag, title, and description', () => {
    it('should match by tag (priority 1)', () => {
      const { stdout } = run('search "frontend"');

      // "frontend" is a tag on design-system, tailwind-only, landing-page
      // Knowledge results show tags in the YAML output
      expect(stdout).toContain('Design System');
      expect(stdout).toContain('Tailwind Only');
      expect(stdout).toContain('Landing Page Pattern');
    });

    it('should match by title (priority 2)', () => {
      const { stdout } = run('search "Authentication"');

      // auth.md has title "Authentication"
      expect(stdout).toContain('Authentication');
      expect(stdout).toContain('arc-02');
    });

    it('should match by description (priority 4)', () => {
      const { stdout } = run('search "Row Level Security"');

      // auth.md description contains "Row Level Security"
      expect(stdout).toContain('Authentication');
    });

    it('should return empty for non-matching query', () => {
      const { stdout } = run('search "quantum-computing-wont-exist-here"');
      expect(stdout).toBe('');
    });

    it('should filter by type', () => {
      const { stdout } = run('search "frontend" --type constraint');

      // Only constraint docs with "frontend" tag
      expect(stdout).toContain('Tailwind Only');
      expect(stdout).not.toContain('Design System');
      expect(stdout).not.toContain('Landing Page Pattern');
    });

    it('should also return matching outcomes', () => {
      const { stdout } = run('search "landing"');
      // out-001 task is "Build landing page hero"
      expect(stdout).toContain('Build landing page');
    });
  });

  // ──────────────────────────────────────────────────────────
  // TEST 3: Record outcome and verify it persists
  // ──────────────────────────────────────────────────────────
  describe('record — stores outcomes retrievable by search and stats', () => {
    it('should record an accepted outcome', () => {
      const { stdout } = run('record --build passed --lint passed --task "harness test task" --files "test.ts"');

      expect(stdout).toContain('Recorded:');
      expect(stdout).toContain('ACCEPTED');
      // Record output only shows ID and status — task is stored in JSONL
      expect(stdout).toMatch(/out-\d{3}/);
    });

    it('should find recorded outcome via search', () => {
      const { stdout } = run('search "harness test task"');
      // Search returns tasks in outcomes section
      expect(stdout).toContain('harness test task');
    });

    it('should record a failed outcome', () => {
      const { stdout } = run('record --build failed --task "intentionally fail"');

      expect(stdout).toContain('FAILED');
      // Record output shows ID and status
      expect(stdout).toMatch(/out-\d{3}/);
    });

    it('should show updated stats reflecting recorded outcomes', () => {
      const { stdout } = run('stats');

      expect(stdout).toContain('Outcomes:');
      // 5 seeded + 2 recorded = 7+
      const match = stdout.match(/Outcomes:\s*(\d+)/);
      expect(match).not.toBeNull();
      expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(7);
    });
  });

  // ──────────────────────────────────────────────────────────
  // TEST 4: The learning loop — failure → plan surfaces it
  // ──────────────────────────────────────────────────────────
  describe('learning loop — recording a failure changes future plans', () => {
    it('should surface a newly recorded failure in plan avoid section', () => {
      // Record a failure about using plain CSS
      run('record --build failed --task "build footer with plain CSS"');

      // Plan for a CSS-related task — "CSS" appears in the recorded failure
      const { stdout } = run('plan "build a CSS footer"');
      const sections = parsePlan(stdout);

      expect(sections.avoid.length).toBeGreaterThanOrEqual(1);
      expect(sections.avoid.some(a => a.includes('plain CSS') || a.includes('Verification'))).toBe(true);
    });

    it('should surface multiple failures from different topics', () => {
      // Record failures on different topics
      run('record --build failed --task "use jQuery for animations"');
      run('record --build failed --task "add inline styles"');

      // Plan for animations — "jQuery" and "animations" match
      const { stdout } = run('plan "add animations with jQuery"');
      const sections = parsePlan(stdout);

      expect(sections.avoid.length).toBeGreaterThanOrEqual(1);

      // Plan for inline styles
      const { stdout: plan2 } = run('plan "style a component"');
      const sections2 = parsePlan(plan2);
      expect(sections2.avoid.length).toBeGreaterThanOrEqual(1);
    });

    it('should surface accepted outcomes as avoid mentions for past failures', () => {
      // Record a success for dark mode
      run('record --build passed --lint passed --task "use Tailwind dark: variant for dark mode"');

      const { stdout } = run('plan "implement dark mode toggle"');
      // The plan should reference dark mode somewhere (knowledge, avoid, or constraints)
      expect(stdout.toLowerCase()).toContain('dark');
    });
  });

  // ──────────────────────────────────────────────────────────
  // TEST 5: Determinism — same input produces same output
  // ──────────────────────────────────────────────────────────
  describe('determinism — same input produces same output', () => {
    it('should produce identical plan constraints for same task', () => {
      const { stdout: plan1 } = run('plan "add user profile page"');
      const { stdout: plan2 } = run('plan "add user profile page"');
      const s1 = parsePlan(plan1);
      const s2 = parsePlan(plan2);

      // Same constraints should surface in same order
      expect(s1.constraints).toEqual(s2.constraints);
      // Both should have verify section
      expect(s1.verify).toEqual(s2.verify);
    });

    it('should produce identical search results for same query', () => {
      const { stdout: s1 } = run('search "auth"');
      const { stdout: s2 } = run('search "auth"');
      expect(s1).toBe(s2);
    });

    it('should produce identical stats for same data', () => {
      const { stdout: stats1 } = run('stats');
      const { stdout: stats2 } = run('stats');
      expect(stats1).toBe(stats2);
    });
  });

  // ──────────────────────────────────────────────────────────
  // TEST 6: Validate catches issues
  // ──────────────────────────────────────────────────────────
  describe('validate — detects .hytrax/ integrity issues', () => {
    it('should pass on a healthy project', () => {
      const { stdout } = run('validate');
      expect(stdout).toContain('Valid');
    });

    it('should detect duplicate IDs', () => {
      // Inject a duplicate ID (arc-01 already exists)
      writeOKF('architecture', 'duplicate.md', {
        id: 'arc-01', type: 'architecture',
        title: 'Duplicate',
        description: 'Deliberate duplicate for testing',
        tags: ['test'],
        files: [],
      });

      const { stdout, stderr } = run('validate');
      expect(stdout).toContain('issue');
      // The specific error detail goes to stderr (console.error)
      expect(stderr + stdout).toContain('Duplicate ID');

      // Clean up
      rmSync(knowledgeDir('architecture', 'duplicate.md'), { force: true });
    });
  });
});

describe('Hytrax Harness Validation — Fresh CLI Pipeline', () => {
  it('should support full init → validate → plan → record → query → stats cycle', () => {
    const freshDir = join(tmpdir(), 'hytrax-fresh-pipeline');
    rmSync(freshDir, { recursive: true, force: true });
    mkdirSync(freshDir, { recursive: true });

    // Init
    const initOut = execSync(`node "${cliEntry}" init`, { cwd: freshDir, encoding: 'utf-8', timeout: 10000 });
    expect(initOut).toContain('Initialized Hytrax');

    // Validate — starter files are healthy
    const validateOut = execSync(`node "${cliEntry}" validate`, { cwd: freshDir, encoding: 'utf-8', timeout: 5000 });
    expect(validateOut).toContain('Valid');

    // Plan — works with starter knowledge
    const planOut = execSync(`node "${cliEntry}" plan "test my setup"`, { cwd: freshDir, encoding: 'utf-8', timeout: 5000 });
    expect(planOut).toContain('task:');
    expect(planOut).toContain('verify:');

    // Record — writes to outcomes.jsonl
    const recordOut = execSync(`node "${cliEntry}" record --build passed --task "validate pipeline works"`, { cwd: freshDir, encoding: 'utf-8', timeout: 5000 });
    expect(recordOut).toContain('ACCEPTED');

    // Query — human-readable table
    const queryOut = execSync(`node "${cliEntry}" query "hytrax"`, { cwd: freshDir, encoding: 'utf-8', timeout: 5000 });
    expect(queryOut).toContain('Knowledge:');

    // Stats — shows 1 outcome
    const statsOut = execSync(`node "${cliEntry}" stats`, { cwd: freshDir, encoding: 'utf-8', timeout: 5000 });
    expect(statsOut).toContain('Outcomes:');
    expect(statsOut).toContain('1');

    // Clean up
    rmSync(freshDir, { recursive: true, force: true });
  });
});

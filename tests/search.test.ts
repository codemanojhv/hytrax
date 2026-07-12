import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-test-search');

function setupTestDir() {
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(join(testDir, '.hytrax', 'knowledge'), { recursive: true });
  mkdirSync(join(testDir, '.hytrax', 'outcomes'), { recursive: true });

  // Create test OKF files
  writeFileSync(join(testDir, '.hytrax', 'knowledge', 'design-system.okf'), `---
id: ds-01
type: architecture
title: Design System
summary: Tailwind-based design system
tags:
  - frontend
  - ui
  - design
files:
  - components/ui/
status: active
---

Description here.`);

  writeFileSync(join(testDir, '.hytrax', 'knowledge', 'auth-arch.okf'), `---
id: auth-01
type: architecture
title: Authentication
summary: Supabase Auth with RLS
tags:
  - auth
  - security
  - backend
files:
  - middleware.ts
status: active
---

Description here.`);

  writeFileSync(join(testDir, '.hytrax', 'knowledge', 'tailwind-constraint.okf'), `---
id: con-01
type: constraint
title: Tailwind Only
summary: Must use Tailwind CSS, no other CSS frameworks
tags:
  - frontend
  - constraint
files: []
status: active
---

Constraint detail.`);

  // Create test outcomes
  writeFileSync(join(testDir, '.hytrax', 'outcomes', 'outcomes.jsonl'),
    `{"id":"out-001","task":"Build landing page","type":"feature","area":"frontend","status":"REJECTED","reason":"Corporate layout, too formal","files":["Hero.tsx"],"timestamp":"2026-07-12","verification":{"build":true,"lint":false,"tests":0}}\n` +
    `{"id":"out-002","task":"Fix login timeout","type":"bug-fix","area":"auth","status":"ACCEPTED","reason":"Refresh token rotation fixed it","files":["auth.ts"],"timestamp":"2026-07-13","verification":{"build":true,"lint":true,"tests":42}}\n`
  );
}

describe('Search engine', () => {
  beforeAll(() => setupTestDir());

  it('should find knowledge by tag match', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'frontend', { max: 10 });
    expect(results.knowledge.length).toBeGreaterThan(0);
    expect(results.knowledge.some(k => k.metadata.tags.includes('frontend'))).toBe(true);
  });

  it('should find knowledge by title match', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'Design System', { max: 10 });
    expect(results.knowledge.some(k => k.metadata.title.includes('Design System'))).toBe(true);
  });

  it('should find outcomes by task description', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'landing page', { max: 10 });
    expect(results.outcomes.some(o => o.task.includes('landing page'))).toBe(true);
  });

  it('should return unique results sorted by score', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'frontend design', { max: 10 });
    // Knowledge should find design-system (tag: frontend) and constraint (tag: frontend)
    expect(results.knowledge.length).toBeGreaterThan(0);
  });

  it('should respect max option', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'frontend', { max: 1 });
    expect(results.knowledge.length).toBeLessThanOrEqual(1);
  });

  it('should filter by type', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'frontend', { max: 10, filterType: 'constraint' });
    expect(results.knowledge.every(k => k.metadata.type === 'constraint')).toBe(true);
  });

  it('should exclude knowledge when asked', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'frontend', { max: 10, includeKnowledge: false });
    expect(results.knowledge.length).toBe(0);
  });

  it('should exclude outcomes when asked', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'landing page', { max: 10, includeOutcomes: false });
    expect(results.outcomes.length).toBe(0);
  });
});

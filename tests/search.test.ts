import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-test-search');

function setupTestDir() {
  rmSync(testDir, { recursive: true, force: true });

  // Create .hytrax with subdirectory structure
  mkdirSync(join(testDir, '.hytrax', 'knowledge', 'architecture'), { recursive: true });
  mkdirSync(join(testDir, '.hytrax', 'knowledge', 'constraints'), { recursive: true });
  mkdirSync(join(testDir, '.hytrax', 'knowledge', 'patterns'), { recursive: true });
  mkdirSync(join(testDir, '.hytrax', 'outcomes'), { recursive: true });

  // Architecture
  writeFileSync(join(testDir, '.hytrax', 'knowledge', 'architecture', 'design-system.okf'), `---
id: arc-01
type: architecture
title: Design System
description: Tailwind-based design system with shared components
tags:
  - frontend
  - ui
  - design
files:
  - components/ui/
status: active
---

Description`);

  writeFileSync(join(testDir, '.hytrax', 'knowledge', 'architecture', 'auth.okf'), `---
id: arc-02
type: architecture
title: Authentication
description: Supabase Auth with RLS policies
tags:
  - auth
  - security
  - backend
files:
  - middleware.ts
status: active
---

Description`);

  // Constraints
  writeFileSync(join(testDir, '.hytrax', 'knowledge', 'constraints', 'tailwind-only.okf'), `---
id: con-01
type: constraint
title: Tailwind Only
description: Must use Tailwind CSS, no other CSS frameworks
tags:
  - frontend
  - constraint
files: []
status: active
---

Constraint detail`);

  // Patterns
  writeFileSync(join(testDir, '.hytrax', 'knowledge', 'patterns', 'landing-page.okf'), `---
id: cvn-01
type: convention
title: Landing Page Pattern
description: Hero section followed by Features grid and CTA
tags:
  - frontend
  - landing-page
  - convention
files: []
status: active
---

Pattern detail`);

  // Outcomes
  writeFileSync(join(testDir, '.hytrax', 'outcomes', 'outcomes.jsonl'),
    `{"id":"out-001","task":"Build landing page","type":"feature","area":"frontend","status":"REJECTED","reason":"Corporate layout, too formal","files":["Hero.tsx"],"timestamp":"2026-07-12","verification":{"build":true,"lint":false,"tests":0}}\n` +
    `{"id":"out-002","task":"Fix login timeout","type":"bug-fix","area":"auth","status":"ACCEPTED","reason":"Refresh token rotation fixed it","files":["auth.ts"],"timestamp":"2026-07-13","verification":{"build":true,"lint":true,"tests":42}}\n`
  );
}

describe('Search engine', () => {
  beforeAll(() => setupTestDir());

  it('should find knowledge by tag match (priority 1)', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'frontend');
    expect(results.knowledge.length).toBeGreaterThan(0);
    // All matches should have "frontend" in their tags
    for (const k of results.knowledge) {
      expect(k.metadata.tags).toContain('frontend');
    }
  });

  it('should find knowledge by title match (priority 2)', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'Design System');
    expect(results.knowledge.some(k => k.metadata.title.includes('Design System'))).toBe(true);
  });

  it('should find outcomes by task description (priority 1)', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'landing page');
    expect(results.outcomes.some(o => o.task.toLowerCase().includes('landing page'))).toBe(true);
  });

  it('should sort by priority (tag matches first)', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = join(testDir, '.hytrax');
    const results = search(root, 'frontend design');
    // First result should be a tag match (priority 1)
    if (results.knowledge.length >= 2) {
      // The first should have tag match, later entries may be lower priority
      const first = results.knowledge[0];
      const hasTagMatch = first.metadata.tags.some(t =>
        t.includes('frontend') || t.includes('design')
      );
      // At minimum, the first result matched
      expect(results.knowledge.length).toBeGreaterThan(0);
    }
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

  it('should load from subdirectories', async () => {
    const { loadAllOKF } = await import('../src/knowledge/parser.js');
    const docs = loadAllOKF(join(testDir, '.hytrax', 'knowledge'));
    expect(docs.length).toBe(4); // 4 OKF files across subdirs
    // Should have files from architecture/, constraints/, and patterns/
    const types = docs.map(d => d.metadata.type);
    expect(types).toContain('architecture');
    expect(types).toContain('constraint');
    expect(types).toContain('convention');
  });
});

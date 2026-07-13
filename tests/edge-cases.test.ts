import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-test-edge');
const hytraxDir = join(testDir, '.hytrax');
const knowledgeDir = join(hytraxDir, 'knowledge');
const archDir = join(knowledgeDir, 'architecture');
const constrDir = join(knowledgeDir, 'constraints');
const outcomesDir = join(hytraxDir, 'outcomes');
const outcomesFile = join(outcomesDir, 'outcomes.jsonl');

describe('OKF Parser — edge cases', () => {
  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(archDir, { recursive: true });
    mkdirSync(constrDir, { recursive: true });
    mkdirSync(outcomesDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should return null for empty file', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(archDir, 'empty.okf');
    writeFileSync(filePath, '', 'utf-8');
    const result = parseOKF(filePath);
    expect(result).toBeNull();
  });

  it('should return null for file with no frontmatter', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(archDir, 'nofm.okf');
    writeFileSync(filePath, 'Just some text without frontmatter', 'utf-8');
    const result = parseOKF(filePath);
    expect(result).toBeNull();
  });

  it('should return null for file with unclosed frontmatter', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(archDir, 'unclosed.okf');
    writeFileSync(filePath, `---
id: test-01
title: Unclosed
---
This has a closing but missing the opening
Jk it's closed
`);
    // Actually this one has proper structure. Let's test truly unclosed:
    const filePath2 = join(archDir, 'truly-unclosed.okf');
    writeFileSync(filePath2, `---
id: test-02
title: Truly Unclosed
tags: []
files: []
status: active`, 'utf-8');
    const result = parseOKF(filePath2);
    expect(result).toBeNull();
  });

  it('should parse valid OKF even without optional fields', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(archDir, 'minimal.okf');
    writeFileSync(filePath, `---
id: test-min
type: architecture
title: Minimal
description: "Minimal test"
tags: []
files: []
status: active
---

Body`, 'utf-8');
    const result = parseOKF(filePath);
    expect(result).not.toBeNull();
    expect(result!.metadata.id).toBe('test-min');
    expect(result!.body).toBe('Body');
  });

  it('should fall back to legacy summary field when description is missing', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(constrDir, 'legacy-summary.okf');
    writeFileSync(filePath, `---
id: con-nosum
type: constraint
title: Legacy Summary
summary: "Old-style summary field"
tags: []
files: []
status: active
---
Body`, 'utf-8');
    const result = parseOKF(filePath);
    expect(result).not.toBeNull();
    expect(result!.metadata.description).toBe('Old-style summary field');
  });

  it('should load nothing from empty knowledge directory', async () => {
    const { loadAllOKF } = await import('../src/knowledge/parser.js');
    const emptyDir = join(testDir, 'empty-knowledge');
    mkdirSync(emptyDir, { recursive: true });
    // No files in it
    const results = loadAllOKF(emptyDir);
    expect(results).toEqual([]);
  });

  it('should load nothing from nonexistent directory', async () => {
    const { loadAllOKF } = await import('../src/knowledge/parser.js');
    const results = loadAllOKF(join(tmpdir(), 'nonexistent-knowledge-dir'));
    expect(results).toEqual([]);
  });

  it('should load OKF files from multiple subdirectories', async () => {
    const { loadAllOKF } = await import('../src/knowledge/parser.js');
    const results = loadAllOKF(knowledgeDir);
    // Should find files from architecture/ and constraints/
    const paths = results.map(r => r.filePath);
    expect(paths.some(p => p.includes('architecture'))).toBe(true);
    expect(paths.some(p => p.includes('constraints'))).toBe(true);
  });
});

describe('Search engine — edge cases', () => {
  it('should return empty results for empty query', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = hytraxDir;
    const results = search(root, '', { max: 10, includeKnowledge: true, includeOutcomes: true });
    expect(results.knowledge).toEqual([]);
    expect(results.outcomes).toEqual([]);
  });

  it('should return empty results for query with no matches', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = hytraxDir;
    const results = search(root, 'zzzzTHISWILLNEVERMATCHzzzz');
    expect(results.knowledge).toEqual([]);
    expect(results.outcomes).toEqual([]);
  });

  it('should return empty results from empty .hytrax/', async () => {
    const { search } = await import('../src/search/engine.js');
    const emptyRoot = join(testDir, 'empty-hytrax');
    mkdirSync(join(emptyRoot, 'knowledge', 'architecture'), { recursive: true });
    mkdirSync(emptyRoot, { recursive: true }); // no outcomes

    const results = search(emptyRoot, 'anything');
    expect(results.knowledge).toEqual([]);
    expect(results.outcomes).toEqual([]);
  });

  it('should handle single-character tokens gracefully', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = hytraxDir;
    const results = search(root, 'a');
    // Should not crash, may or may not match
    expect(Array.isArray(results.knowledge)).toBe(true);
    expect(Array.isArray(results.outcomes)).toBe(true);
  });

  it('should respect max of 0', async () => {
    const { search } = await import('../src/search/engine.js');
    const root = hytraxDir;
    const results = search(root, 'architecture', { max: 0 });
    expect(results.knowledge).toEqual([]);
    expect(results.outcomes).toEqual([]);
  });
});

describe('Outcome writer — edge cases', () => {
  it('should FAIL when build fails even with lint passing', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts = { build: 'failed' as const, lint: 'passed' as const };
    const record = writeOutcome(outcomesFile, facts);
    expect(record.status).toBe('FAILED');
  });

  it('should set reason for failed outcomes', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts = { build: 'failed' as const };
    const record = writeOutcome(outcomesFile, facts);
    expect(record.reason).toBeTruthy();
  });

  it('should prefer user-feedback as reason', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts = { build: 'passed' as const, 'user-feedback': 'Client rejected it' as string };
    const record = writeOutcome(outcomesFile, facts);
    expect(record.reason).toBe('Client rejected it');
  });

  it('should handle minimum facts (build only)', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts = { build: 'passed' as const };
    const record = writeOutcome(outcomesFile, facts);
    expect(record.status).toBe('ACCEPTED');
    expect(record.id).toBeTruthy();
    expect(record.task).toBe('unknown task');
    expect(record.files).toEqual([]);
    expect(record.verification.build).toBe(true);
  });

  it('should preserve approach when provided', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const facts = { build: 'passed' as const, approach: 'Used server components' };
    const record = writeOutcome(outcomesFile, facts);
    expect(record.approach).toBe('Used server components');
  });

  it('should write to created directory if missing', async () => {
    const { writeOutcome } = await import('../src/outcomes/writer.js');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');
    const { rmSync } = await import('node:fs');
    const newDir = join(tmpdir(), 'hytrax-new-outcomes');
    rmSync(newDir, { recursive: true, force: true });
    const newFile = join(newDir, 'outcomes.jsonl');
    const facts = { build: 'passed' as const, task: 'fresh start' };
    const record = writeOutcome(newFile, facts);
    expect(record.status).toBe('ACCEPTED');
    expect(record.task).toBe('fresh start');
    // Clean up
    rmSync(newDir, { recursive: true, force: true });
  });
});

describe('Path utilities — edge cases', () => {
  it('should return null when no .hytrax/ exists up to root', async () => {
    const { findHytraxRoot } = await import('../src/utils/paths.js');
    const result = findHytraxRoot(join(tmpdir(), 'path-without-hytrax'));
    expect(result).toBeNull();
  });

  it('should return correct sub-paths from root', async () => {
    const { join } = await import('node:path');
    const { getKnowledgeDir, getOutcomesFile, getConfigPath } = await import('../src/utils/paths.js');
    const root = '/project/.hytrax';
    expect(getKnowledgeDir(root)).toBe(join(root, 'knowledge'));
    expect(getOutcomesFile(root)).toBe(join(root, 'outcomes', 'outcomes.jsonl'));
    expect(getConfigPath(root)).toBe(join(root, 'config.toml'));
  });
});

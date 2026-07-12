import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-test-parser');

describe('OKF Parser', () => {
  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  it('should parse valid OKF with frontmatter and body', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(testDir, 'test.okf');
    writeFileSync(filePath, `---
id: test-01
type: architecture
title: Test
summary: A test
tags:
  - test
  - demo
files:
  - src/test.ts
status: active
---

Body content here.`);

    const result = parseOKF(filePath);
    expect(result).not.toBeNull();
    expect(result!.metadata.id).toBe('test-01');
    expect(result!.metadata.type).toBe('architecture');
    expect(result!.metadata.tags).toEqual(['test', 'demo']);
    expect(result!.metadata.files).toEqual(['src/test.ts']);
    expect(result!.body).toBe('Body content here.');
  });

  it('should return null for malformed file', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(testDir, 'bad.okf');
    writeFileSync(filePath, 'No frontmatter here');
    const result = parseOKF(filePath);
    expect(result).toBeNull();
  });

  it('should load all OKF from directory', async () => {
    const { loadAllOKF } = await import('../src/knowledge/parser.js');
    const results = loadAllOKF(join(tmpdir(), 'hytrax-test-parser'));
    expect(results.length).toBeGreaterThan(0);
  });
});

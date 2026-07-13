import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const testDir = join(tmpdir(), 'hytrax-test-parser');

describe('OKF Parser', () => {
  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(join(testDir, 'architecture'), { recursive: true });
    mkdirSync(join(testDir, 'constraints'), { recursive: true });
  });

  it('should parse valid OKF with frontmatter and body', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(testDir, 'architecture', 'test.md');
    writeFileSync(filePath, `---
id: test-01
type: architecture
title: Test
description: A test object
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
    const filePath = join(testDir, 'bad.md');
    writeFileSync(filePath, 'No frontmatter here');
    const result = parseOKF(filePath);
    expect(result).toBeNull();
  });

  it('should parse standard inline YAML arrays', async () => {
    const { parseOKF } = await import('../src/knowledge/parser.js');
    const filePath = join(testDir, 'architecture', 'inline.md');
    writeFileSync(filePath, `---\ntype: architecture\ntags: [frontend, "team"]\nfiles: [src/app.ts]\n---\n`);
    const result = parseOKF(filePath);
    expect(result!.metadata.tags).toEqual(['frontend', 'team']);
    expect(result!.metadata.files).toEqual(['src/app.ts']);
  });

  it('should load all OKF from subdirectories recursively', async () => {
    const { loadAllOKF } = await import('../src/knowledge/parser.js');
    const results = loadAllOKF(testDir);
    expect(results.length).toBeGreaterThan(0);
  });
});

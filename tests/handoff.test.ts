import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseHandoffContent } from '../src/handoff/parser.js';
import { createHandoff, validateHandoff } from '../src/handoff/writer.js';
import { renderResume } from '../src/handoff/resume.js';

const root = join(tmpdir(), 'hytrax-handoff-unit');
const handoff = `---
id: hnd-new
type: handoff
status: open
source_agent: claude-code
task: migrate auth
created_at: 2026-07-15T00:00:00Z
tags: [auth]
files: []
---

# Goal

Move auth to the shared session layer.

# Next actions

1. Run the auth tests.
`;

describe('portable handoffs', () => {
  it('parses and validates the provider-neutral format', () => {
    const parsed = parseHandoffContent(handoff);
    expect(parsed?.sourceAgent).toBe('claude-code');
    expect(parsed?.task).toBe('migrate auth');
    expect(validateHandoff(parsed!)).toEqual([]);
  });

  it('creates an id and resumes the handoff with constraints', () => {
    rmSync(root, { recursive: true, force: true });
    mkdirSync(join(root, '.hytrax', 'knowledge', 'constraints'), { recursive: true });
    writeFileSync(join(root, '.hytrax', 'knowledge', 'constraints', 'auth.md'), `---\nid: con-01\ntype: constraint\ntitle: Server auth\ndescription: Keep auth server-side\ntags: [auth, constraint]\nfiles: []\nstatus: active\n---\n`);
    const created = createHandoff(join(root, '.hytrax'), handoff);
    expect(created.id).toBe('hnd-001');
    const output = renderResume(join(root, '.hytrax'), 'migrate auth');
    expect(output).toContain('hnd-001');
    expect(output).toContain('Server auth');
    expect(output).toContain('Keep auth server-side');
  });

  it('imports plain handoff Markdown from another agent', () => {
    const plain = createHandoff(join(root, '.hytrax'), '# Current state\n\nThe callback is implemented.\n\n# Next steps\n\n1. Run tests.\n', { sourceAgent: 'claude-code', task: 'finish auth' });
    expect(plain.sourceAgent).toBe('claude-code');
    expect(plain.task).toBe('finish auth');
  });
});

import { mkdirSync, writeFileSync, existsSync, appendFileSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CONFIG = `[project]
name = "my-project"

[search]
max_results = 10
`;

const KNOWLEDGE_SUBDIRS = ['architecture', 'constraints', 'patterns', 'workflows'];

const SAMPLE_ARCHITECTURE = `---
id: arc-01
type: architecture
title: Project Overview
description: "Add a brief description of your project architecture here."
tags:
  - architecture
files: []
status: active
timestamp: ${new Date().toISOString()}
---

# Project Overview

Describe your project architecture here. This is read by your AI coding agent
at the start of every task to provide context.

## Key Components

(Add key components and their relationships)

## Conventions

(Add project-specific conventions)
`;

const STARTER_WORKFLOW = `---
id: wf-01
type: workflow
title: Hytrax Knowledge Loop
description: "Resume shared context before coding, then record a handoff when switching agents."
tags:
  - workflow
  - hytrax
  - mandatory
files: []
status: active
timestamp: ${new Date().toISOString()}
---

# Hytrax Knowledge Loop

This project uses Hytrax for portable project context. Every agent—Claude Code,
Codex, OpenCode, or another coding agent—MUST follow this loop:

1. **Resume**: \`npx hytrax resume "<task description>"\`
2. **Plan**: \`npx hytrax plan "<task description>"\` when no useful handoff exists.
3. **Work and verify**: Run the project build, tests, and lint checks.
4. **Handoff**: Save the current state with \`npx hytrax handoff create --stdin\` when pausing or switching agents.
5. **Record**: \`npx hytrax record --build passed|failed --task "<task>"\`
6. **Add knowledge**: After discovering durable constraints, patterns, or decisions.

## Why

The handoff is plain Markdown plus simple frontmatter, so it is portable across
agentic coding platforms and can be piped from any automation.
`;

const STARTER_CONSTRAINT = `---
id: con-01
type: constraint
title: Hytrax first, code second
description: "Run hytrax plan before writing any code. Every time."
tags:
  - hytrax
  - constraint
  - mandatory
files: []
status: active
timestamp: ${new Date().toISOString()}
---

Never write code without first running:
\`\`\`
npx hytrax plan "<what you're about to do>"
\`\`\`

This is not optional. Even if the knowledge directory is empty — that's a signal to backfill, not to skip.
`;

const AGENT_INSTRUCTIONS = `
<!-- hytrax:start -->
## Hytrax (provider-neutral project context)

Work normally without invoking Hytrax. When the user says "use Hytrax", "save context",
"handoff", "switch agents", or "continue previous work", read
\`.hytrax/skills/hytrax/SKILL.md\` and follow it.
On a requested context switch, create a handoff with \`npx hytrax handoff create --stdin\`.
When continuing after a switch, run \`npx hytrax resume "<task>"\` before planning or editing;
if no useful handoff exists, run \`npx hytrax plan "<task>"\`.
After verification, run \`npx hytrax record --build passed|failed --task "<task>"\`.
<!-- hytrax:end -->
`;

function bundledSkill(): string {
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'hytrax', 'SKILL.md');
  try { return readFileSync(path, 'utf8'); }
  catch { return '# Hytrax\n\nUse `hytrax handoff create --stdin` to save context and `hytrax resume "<task>"` to continue it.\n'; }
}

export function installHytraxSkill(projectRoot: string): 'created' | 'exists' {
  const filePath = join(projectRoot, '.hytrax', 'skills', 'hytrax', 'SKILL.md');
  if (existsSync(filePath)) return 'exists';
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, bundledSkill(), 'utf8');
  return 'created';
}

export function installAgentInstructions(projectRoot: string, fileName = 'AGENTS.md'): 'created' | 'updated' | 'exists' {
  const filePath = join(projectRoot, fileName);
  const rel = relative(resolve(projectRoot), resolve(filePath));
  if (isAbsolute(fileName) || rel === '..' || rel.startsWith('..')) throw new Error('Agent instruction file must stay inside the project.');
  mkdirSync(dirname(filePath), { recursive: true });
  if (!existsSync(filePath)) {
    writeFileSync(filePath, AGENT_INSTRUCTIONS.trimStart(), 'utf8');
    return 'created';
  }
  const existing = readFileSync(filePath, 'utf8');
  if (existing.includes('<!-- hytrax:start -->') && existing.includes('<!-- hytrax:end -->')) {
    const updated = existing.replace(/<!-- hytrax:start -->[\s\S]*?<!-- hytrax:end -->/, AGENT_INSTRUCTIONS.trim());
    if (updated !== existing) writeFileSync(filePath, updated, 'utf8');
    return updated === existing ? 'exists' : 'updated';
  }
  appendFileSync(filePath, AGENT_INSTRUCTIONS, 'utf8');
  return 'updated';
}

export function scaffoldHytrax(projectRoot: string): string[] {
  const created: string[] = [];
  const hytraxDir = join(projectRoot, '.hytrax');

  if (existsSync(hytraxDir)) {
    installHytraxSkill(projectRoot);
    return ['exists'];
  }

  // Create outcomes directory
  mkdirSync(join(hytraxDir, 'outcomes'), { recursive: true });
  created.push('.hytrax/outcomes/');

  mkdirSync(join(hytraxDir, 'context', 'handoffs'), { recursive: true });
  created.push('.hytrax/context/handoffs/');
  installHytraxSkill(projectRoot);
  created.push('.hytrax/skills/hytrax/SKILL.md');

  // Create knowledge subdirectories
  for (const subdir of KNOWLEDGE_SUBDIRS) {
    mkdirSync(join(hytraxDir, 'knowledge', subdir), { recursive: true });
    created.push(`.hytrax/knowledge/${subdir}/`);
  }

  // Create config
  writeFileSync(join(hytraxDir, 'config.toml'), DEFAULT_CONFIG, 'utf-8');
  created.push('.hytrax/config.toml');

  // Create sample architecture file
  writeFileSync(
    join(hytraxDir, 'knowledge', 'architecture', 'overview.md'),
    SAMPLE_ARCHITECTURE,
    'utf-8',
  );
  created.push('.hytrax/knowledge/architecture/overview.md');

  // Create starter knowledge for the Hytrax loop itself
  writeFileSync(
    join(hytraxDir, 'knowledge', 'workflows', 'hytrax-loop.md'),
    STARTER_WORKFLOW,
    'utf-8',
  );
  created.push('.hytrax/knowledge/workflows/hytrax-loop.md');

  writeFileSync(
    join(hytraxDir, 'knowledge', 'constraints', 'hytrax-first.md'),
    STARTER_CONSTRAINT,
    'utf-8',
  );
  created.push('.hytrax/knowledge/constraints/hytrax-first.md');

  // Create empty outcomes file
  writeFileSync(join(hytraxDir, 'outcomes', 'outcomes.jsonl'), '', 'utf-8');
  created.push('.hytrax/outcomes/outcomes.jsonl');

  return created;
}

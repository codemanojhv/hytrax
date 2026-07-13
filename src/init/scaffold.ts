import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CONFIG = `[project]
name = "my-project"

[search]
max_results = 10

[record]
promotion_threshold = 3
`;

const KNOWLEDGE_SUBDIRS = ['architecture', 'constraints', 'patterns', 'workflows'];

const SAMPLE_ARCHITECTURE = `---
id: arc-01
type: architecture
title: Project Overview
summary: "Add a brief summary of your project architecture here."
tags:
  - architecture
files: []
status: active
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
summary: "Before writing any code, run hytrax plan, then search, then record after."
tags:
  - workflow
  - hytrax
  - mandatory
files: []
status: active
---

# Hytrax Knowledge Loop

This project uses Hytrax for project memory. Every task MUST follow this loop:

1. **Plan**: \`npx hytrax plan "<task description>"\`
2. **Search**: \`npx hytrax search "<keywords>"\`
3. **Record**: \`npx hytrax record --build passed|failed --task "<task>"\`
4. **Add knowledge**: After discovering new constraints, patterns, or decisions.

## Why

Without this loop, the knowledge directory stays empty and every task is a cold start.
`;

const STARTER_CONSTRAINT = `---
id: con-01
type: constraint
title: Hytrax first, code second
summary: "Run hytrax plan before writing any code. Every time."
tags:
  - hytrax
  - constraint
  - mandatory
files: []
status: active
---

Never write code without first running:
\`\`\`
npx hytrax plan "<what you're about to do>"
\`\`\`

This is not optional. Even if the knowledge directory is empty — that's a signal to backfill, not to skip.
`;

export function scaffoldHytrax(projectRoot: string): string[] {
  const created: string[] = [];
  const hytraxDir = join(projectRoot, '.hytrax');

  if (existsSync(hytraxDir)) {
    return ['exists'];
  }

  // Create outcomes directory
  mkdirSync(join(hytraxDir, 'outcomes'), { recursive: true });
  created.push('.hytrax/outcomes/');

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
    join(hytraxDir, 'knowledge', 'architecture', 'overview.okf'),
    SAMPLE_ARCHITECTURE,
    'utf-8',
  );
  created.push('.hytrax/knowledge/architecture/overview.okf');

  // Create starter knowledge for the Hytrax loop itself
  writeFileSync(
    join(hytraxDir, 'knowledge', 'workflows', 'hytrax-loop.okf'),
    STARTER_WORKFLOW,
    'utf-8',
  );
  created.push('.hytrax/knowledge/workflows/hytrax-loop.okf');

  writeFileSync(
    join(hytraxDir, 'knowledge', 'constraints', 'hytrax-first.okf'),
    STARTER_CONSTRAINT,
    'utf-8',
  );
  created.push('.hytrax/knowledge/constraints/hytrax-first.okf');

  // Create empty outcomes file
  writeFileSync(join(hytraxDir, 'outcomes', 'outcomes.jsonl'), '', 'utf-8');
  created.push('.hytrax/outcomes/outcomes.jsonl');

  return created;
}

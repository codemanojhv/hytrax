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

  // Create empty outcomes file
  writeFileSync(join(hytraxDir, 'outcomes', 'outcomes.jsonl'), '', 'utf-8');
  created.push('.hytrax/outcomes/outcomes.jsonl');

  return created;
}

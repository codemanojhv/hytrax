import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DEFAULT_CONFIG = `[project]
name = "my-project"

[search]
max_results = 10

[record]
promotion_threshold = 3
`;

const EMPTY_OKF = `---
id: welcome
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

  // Create directories
  mkdirSync(join(hytraxDir, 'knowledge'), { recursive: true });
  mkdirSync(join(hytraxDir, 'outcomes'), { recursive: true });

  // Create config
  writeFileSync(join(hytraxDir, 'config.toml'), DEFAULT_CONFIG, 'utf-8');
  created.push('.hytrax/config.toml');

  // Create sample knowledge file
  writeFileSync(join(hytraxDir, 'knowledge', 'architecture.okf'), EMPTY_OKF, 'utf-8');
  created.push('.hytrax/knowledge/architecture.okf');

  // Create empty outcomes file
  writeFileSync(join(hytraxDir, 'outcomes', 'outcomes.jsonl'), '', 'utf-8');
  created.push('.hytrax/outcomes/outcomes.jsonl');

  return created;
}

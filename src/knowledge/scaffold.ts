import { writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { OKFType } from './types.js';

const TYPE_DIR_MAP: Record<string, string> = {
  architecture: 'architecture',
  decision: 'architecture',    // decisions live in architecture/
  constraint: 'constraints',
  convention: 'patterns',
  workflow: 'workflows',
  api: 'architecture',
  feature: 'patterns',
  preference: 'patterns',
};

const TYPE_PREFIXES: Record<string, string> = {
  architecture: 'arc',
  decision: 'dec',
  constraint: 'con',
  convention: 'cvn',
  workflow: 'wf',
  api: 'api',
  feature: 'feat',
  preference: 'pref',
};

export function scaffoldOKF(knowledgeDir: string, type: OKFType, title: string): string {
  const subdir = TYPE_DIR_MAP[type] ?? 'architecture';
  const targetDir = join(knowledgeDir, subdir);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const prefix = TYPE_PREFIXES[type] ?? 'obj';
  const existing = readdirSync(targetDir).filter(f => f.startsWith(prefix));
  const nextNum = String(existing.length + 1).padStart(2, '0');
  const id = `${prefix}-${nextNum}`;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  const fileName = `${slug}.okf`;
  const filePath = join(targetDir, fileName);

  const now = new Date().toISOString();
  const content = `---
id: ${id}
type: ${type}
title: ${title}
description: ""
tags:
  - ${type}
files: []
status: active
timestamp: ${now}
---

# ${title}

(Describe the ${type}, when it applies, and key details.)
`;

  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

import { writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { OKFType } from './types.js';

const TYPE_DIR_MAP: Record<string, string> = {
  architecture: 'architecture',
  decision: 'architecture',
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

/**
 * Determine the next available ID by scanning all .okf files in a directory
 * for existing IDs matching the given prefix. This handles files with arbitrary
 * filenames (e.g., "tailwind-only.okf" with id: con-01).
 */
function nextIdForPrefix(targetDir: string, prefix: string): string {
  if (!existsSync(targetDir)) return `${prefix}-01`;

  let maxNum = 0;
  const files = readdirSync(targetDir).filter(f => f.endsWith('.okf'));

  for (const file of files) {
    try {
      const content = readFileSync(join(targetDir, file), 'utf-8');
      const match = content.match(/^---\n([\s\S]*?)id:\s*(\S+)[\s\S]*?\n---/);
      if (match) {
        const id = match[2];
        const idMatch = id.match(new RegExp(`^${prefix}-(\\d+)$`));
        if (idMatch) {
          const num = parseInt(idMatch[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return `${prefix}-${String(maxNum + 1).padStart(2, '0')}`;
}

export function scaffoldOKF(knowledgeDir: string, type: OKFType, title: string): string {
  const subdir = TYPE_DIR_MAP[type] ?? 'architecture';
  const targetDir = join(knowledgeDir, subdir);

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const prefix = TYPE_PREFIXES[type] ?? 'obj';
  const id = nextIdForPrefix(targetDir, prefix);

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

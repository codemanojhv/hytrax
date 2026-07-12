import { writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { OKFType } from './types.js';

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
  if (!existsSync(knowledgeDir)) {
    mkdirSync(knowledgeDir, { recursive: true });
  }

  const prefix = TYPE_PREFIXES[type] ?? 'obj';
  const existing = readdirSync(knowledgeDir).filter(f => f.startsWith(prefix));
  const nextNum = String(existing.length + 1).padStart(2, '0');
  const id = `${prefix}-${nextNum}`;

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  const fileName = `${slug}.okf`;
  const filePath = join(knowledgeDir, fileName);

  const content = `---
id: ${id}
type: ${type}
title: ${title}
summary: ""
tags:
  - ${type}
files: []
status: active
---

# ${title}

(Describe the ${type}, when it applies, and key details.)
`;

  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

export function generateKnowledgeTemplate(type: OKFType, title: string): string {
  const prefix = TYPE_PREFIXES[type] ?? 'obj';
  const id = `${prefix}-01`;

  return `---
id: ${id}
type: ${type}
title: ${title}
summary: ""
tags:
  - ${type}
files: []
status: active
---

# ${title}

(Describe the ${type}, when it applies, and key details.)
`;
}

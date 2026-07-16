import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_CONFIG = `[project]
name = "my-project"

[search]
max_results = 10
`;

const KNOWLEDGE_SUBDIRS = ['architecture', 'constraints', 'patterns', 'workflows'];

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
  catch { return '# Hytrax\n\nUse `npx hytrax handoff create --stdin` to save context and `npx hytrax resume "<task>"` to continue it.\n'; }
}

export function installHytraxSkill(projectRoot: string): 'created' | 'updated' | 'exists' {
  const filePath = join(projectRoot, '.hytrax', 'skills', 'hytrax', 'SKILL.md');
  const content = bundledSkill();
  if (existsSync(filePath)) {
    if (readFileSync(filePath, 'utf8') === content) return 'exists';
    writeFileSync(filePath, content, 'utf8');
    return 'updated';
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
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
  if (existsSync(hytraxDir)) return ['exists'];

  mkdirSync(join(hytraxDir, 'outcomes'), { recursive: true });
  created.push('.hytrax/outcomes/');
  mkdirSync(join(hytraxDir, 'context', 'handoffs'), { recursive: true });
  created.push('.hytrax/context/handoffs/');
  installHytraxSkill(projectRoot);
  created.push('.hytrax/skills/hytrax/SKILL.md');

  for (const subdir of KNOWLEDGE_SUBDIRS) {
    mkdirSync(join(hytraxDir, 'knowledge', subdir), { recursive: true });
    created.push(`.hytrax/knowledge/${subdir}/`);
  }
  writeFileSync(join(hytraxDir, 'config.toml'), DEFAULT_CONFIG, 'utf8');
  created.push('.hytrax/config.toml');
  writeFileSync(join(hytraxDir, 'outcomes', 'outcomes.jsonl'), '', 'utf8');
  created.push('.hytrax/outcomes/outcomes.jsonl');
  return created;
}

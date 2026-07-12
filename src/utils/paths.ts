import { existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const HYTRAX_DIR = '.hytrax';

export function findHytraxRoot(startDir?: string): string | null {
  let dir = startDir ? resolve(startDir) : process.cwd();

  // Walk up to find .hytrax/
  while (true) {
    const candidate = join(dir, HYTRAX_DIR);
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = resolve(dir, '..');
    if (parent === dir) return null; // hit filesystem root
    dir = parent;
  }
}

export function getKnowledgeDir(hytraxRoot: string): string {
  return join(hytraxRoot, 'knowledge');
}

export function getOutcomesFile(hytraxRoot: string): string {
  return join(hytraxRoot, 'outcomes', 'outcomes.jsonl');
}

export function getConfigPath(hytraxRoot: string): string {
  return join(hytraxRoot, 'config.toml');
}

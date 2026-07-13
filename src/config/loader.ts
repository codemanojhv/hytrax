import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'smol-toml';
import type { HytraxConfig } from '../knowledge/types.js';
import { findHytraxRoot } from '../utils/paths.js';

const DEFAULT_CONFIG: HytraxConfig = {
  project: { name: 'my-project' },
  search: { max_results: 10 },
};

export function loadConfig(cwd?: string): HytraxConfig {
  const root = findHytraxRoot(cwd);
  if (!root) return DEFAULT_CONFIG;

  const configPath = join(root, 'config.toml');
  if (!existsSync(configPath)) return DEFAULT_CONFIG;

  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed = parse(raw) as any;

    return {
      project: {
        name: parsed.project?.name ?? DEFAULT_CONFIG.project.name,
      },
      search: {
        max_results: parsed.search?.max_results ?? DEFAULT_CONFIG.search.max_results,
      },
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

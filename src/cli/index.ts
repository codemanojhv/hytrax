import { Command } from 'commander';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initCommand } from './commands/init.js';
import { planCommand } from './commands/plan.js';
import { searchCommand } from './commands/search.js';
import { recordCommand } from './commands/record.js';
import { queryCommand } from './commands/query.js';
import { validateCommand } from './commands/validate.js';
import { statsCommand } from './commands/stats.js';
import { knowledgeCommand } from './commands/knowledge.js';
import { handoffCommand } from './commands/handoff.js';
import { resumeCommand } from './commands/resume.js';

function getVersion(): string {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const pkgPath = join(__dirname, '..', '..', 'package.json');
    if (existsSync(pkgPath)) {
      return JSON.parse(readFileSync(pkgPath, 'utf-8')).version || '0.1.0';
    }
  } catch {}
  return '0.1.0';
}

export function createCLI(): Command {
  const program = new Command();

  program
    .name('hytrax')
    .description('Local, deterministic knowledge layer for AI coding agents')
    .version(getVersion());

  program.addCommand(initCommand());
  program.addCommand(planCommand());
  program.addCommand(searchCommand());
  program.addCommand(recordCommand());
  program.addCommand(queryCommand());
  program.addCommand(validateCommand());
  program.addCommand(statsCommand());
  program.addCommand(knowledgeCommand());
  program.addCommand(handoffCommand());
  program.addCommand(resumeCommand());

  return program;
}

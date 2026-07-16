import { Command } from 'commander';
import { findHytraxRoot } from '../../utils/paths.js';
import { renderResume } from '../../handoff/resume.js';

export function resumeCommand(): Command {
  return new Command('resume')
    .description('Assemble portable context for a new agent session')
    .argument('[task]', 'Current task')
    .option('--handoff <id>', 'Use an exact handoff')
    .option('--max-chars <n>', 'Maximum context size', value => parseInt(value, 10), 12000)
    .action((task: string | undefined, opts: { handoff?: string; maxChars: number }) => {
      const root = findHytraxRoot();
      if (!root) { console.error('No .hytrax/ found. Run: npx hytrax init'); process.exit(1); }
      try { console.log(renderResume(root!, task, opts.handoff, opts.maxChars)); }
      catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); }
    });
}

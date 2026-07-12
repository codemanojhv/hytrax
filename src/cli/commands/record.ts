import { Command } from 'commander';
import { writeOutcome } from '../../outcomes/writer.js';
import { findHytraxRoot } from '../../utils/paths.js';
import { getOutcomesFile } from '../../utils/paths.js';
import type { OutcomeFacts } from '../../knowledge/types.js';

export function recordCommand(): Command {
  return new Command('record')
    .description('Record a task outcome')
    .requiredOption('--build <status>', 'Build status: passed or failed')
    .option('--lint <status>', 'Lint status: passed or failed')
    .option('--tests <n>', 'Number of passing tests', parseInt)
    .option('--files <files>', 'Comma-separated changed files')
    .option('--task <task>', 'Task description')
    .option('--approach <approach>', 'Brief description of approach')
    .option('--user-feedback <feedback>', 'User feedback (accept/reject)')
    .action((opts: any) => {
      const root = findHytraxRoot();
      if (!root) {
        console.error('No .hytrax/ found. Run: npx hytrax init');
        process.exit(1);
      }

      const facts: OutcomeFacts = {
        build: opts.build as 'passed' | 'failed',
        lint: opts.lint as 'passed' | 'failed' | undefined,
        tests: opts.tests,
        files: opts.files ? opts.files.split(',').map((f: string) => f.trim()) : undefined,
        task: opts.task,
        approach: opts.approach,
        'user-feedback': opts.userFeedback,
      };

      const outcomesFile = getOutcomesFile(root);
      const record = writeOutcome(outcomesFile, facts);

      console.log(`Recorded: ${record.id}`);
      console.log(`Status: ${record.status}`);
    });
}

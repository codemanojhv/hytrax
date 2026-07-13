import { Command } from 'commander';
import { writeOutcome } from '../../outcomes/writer.js';
import { findHytraxRoot, getKnowledgeDir } from '../../utils/paths.js';
import { getOutcomesFile } from '../../utils/paths.js';
import { scaffoldOKF } from '../../knowledge/scaffold.js';
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

      // P1: On failure, auto-suggest a constraint draft
      if (record.status === 'FAILED' || record.status === 'REJECTED') {
        const knowledgeDir = getKnowledgeDir(root);
        const title = `Avoid: ${record.task}`;
        try {
          const filePath = scaffoldOKF(knowledgeDir, 'constraint', title);
          console.log(`Suggestion: Edit ${filePath} to document why this failed.`);
        } catch {
          // Non-fatal
        }
      }

      // P4: On ACCEPTED, notify if related failures were superseded
      if (record.status === 'ACCEPTED' && record.reason?.startsWith('Superseded')) {
        console.log(`Note: Related failures auto-superseded.`);
      }
    });
}

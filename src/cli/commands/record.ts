import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { determineOutcome, writeOutcome } from '../../outcomes/writer.js';
import { findHytraxRoot, getKnowledgeDir } from '../../utils/paths.js';
import { getOutcomesFile } from '../../utils/paths.js';
import { scaffoldOKF } from '../../knowledge/scaffold.js';
import type { OutcomeFacts } from '../../knowledge/types.js';

export function recordCommand(): Command {
  return new Command('record')
    .description('Record a task outcome')
    .option('--build <status>', 'Build status: passed or failed')
    .option('--lint <status>', 'Lint status: passed or failed')
    .option('--tests <n>', 'Number of passing tests', parseInt)
    .option('--files <files>', 'Comma-separated changed files')
    .option('--task <task>', 'Task description')
    .option('--approach <approach>', 'Brief description of approach')
    .option('--user-feedback <feedback>', 'User feedback (accept/reject)')
    .option('--auto', 'Run available package verification scripts and record the result')
    .option('--dry-run', 'Show the outcome without writing it')
    .action((opts: any) => {
      const root = findHytraxRoot();
      if (!root) {
        console.error('No .hytrax/ found. Run: npx hytrax init');
        process.exit(1);
      }

      if (!opts.build && !opts.auto) {
        console.error('Provide --build passed|failed, or use --auto.');
        process.exit(1);
      }

      let build = opts.build as 'passed' | 'failed' | undefined;
      let lint = opts.lint as 'passed' | 'failed' | undefined;
      if (opts.auto) {
        const packagePath = `${process.cwd()}/package.json`;
        const scripts = existsSync(packagePath) ? JSON.parse(readFileSync(packagePath, 'utf8')).scripts ?? {} : {};
        if (!scripts.build) {
          console.error('--auto requires a package.json build script. Use --build instead.');
          process.exit(1);
        }
        const run = (script: string) => spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', script], { stdio: 'inherit' }).status === 0;
        build = run('build') ? 'passed' : 'failed';
        if (build === 'passed' && scripts.lint) lint = run('lint') ? 'passed' : 'failed';
        if (build === 'passed' && (!scripts.lint || lint === 'passed') && scripts.test) run('test');
      }

      const facts: OutcomeFacts = {
        build: build!,
        lint,
        tests: opts.tests,
        files: opts.files ? opts.files.split(',').map((f: string) => f.trim()) : undefined,
        task: opts.task,
        approach: opts.approach,
        'user-feedback': opts.userFeedback,
      };

      if (opts.dryRun) {
        console.log(`Would record: ${determineOutcome(facts)}`);
        return;
      }

      const outcomesFile = getOutcomesFile(root);
      const record = writeOutcome(outcomesFile, facts);

      console.log(`Recorded: ${record.id}`);
      console.log(`Status: ${record.status}`);

      // P1: On failure, auto-create a fully populated constraint
      if (!opts.auto && (record.status === 'FAILED' || record.status === 'REJECTED')) {
        const knowledgeDir = getKnowledgeDir(root);
        const title = `Avoid: ${record.task}`;
        try {
          const filePath = scaffoldOKF(knowledgeDir, 'constraint', title);
          // Overwrite the draft with complete content
          const description = record.reason && record.reason !== 'Verification failed'
            ? record.reason
            : `Never ${record.task.toLowerCase()}. This approach failed verification.`;
          const files = record.files.length > 0
            ? record.files.map(f => `  - ${f}`).join('\n')
            : '  - (add related files)';
          const body = record.approach
            ? `## What failed\n\n${record.task}\n\n## Approach that failed\n\n${record.approach}\n\n## Why\n\n${description}`
            : `## What failed\n\n${record.task}\n\n## Why\n\n${description}`;

          const full = `---
id: ${record.id.replace('out-', 'con-')}
source_outcome: ${record.id}
type: constraint
title: ${title}
description: "${description}"
tags:
  - constraint
  - avoid
files:
${files}
status: active
timestamp: ${new Date().toISOString()}
---

# ${title}

${body}
`;
          writeFileSync(filePath, full, 'utf-8');
          console.log(`Constraint: ${filePath}`);
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

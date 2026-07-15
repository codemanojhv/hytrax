import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { findHytraxRoot, getHandoffsDir } from '../../utils/paths.js';
import { findHandoff, createHandoff, updateHandoffStatus, validateHandoff } from '../../handoff/writer.js';
import { listHandoffFiles, loadHandoffs } from '../../handoff/parser.js';
import { decodeText } from '../../utils/text.js';

const TEMPLATE = `---
id: hnd-new
type: handoff
status: open
source_agent: claude-code
task: "Describe the work"
created_at: ${new Date().toISOString()}
tags: [project]
files: []
---

# Goal

What must be true when this work is complete?

# Completed

- What was already done?

# Decisions

- What choices must the next agent preserve?

# Active constraints

- What rules must not be violated?

# Known problems / risks

- What is uncertain or still broken?

# Next actions

1. The first concrete next step.

# Commands run

- npm test
`;

function rootOrExit(): string {
  const root = findHytraxRoot();
  if (!root) {
    console.error('No .hytrax/ found. Run: npx hytrax init');
    process.exit(1);
  }
  return root!;
}

export function handoffCommand(): Command {
  const cmd = new Command('handoff').description('Create and manage portable agent handoffs');
  cmd.command('template').description('Print a provider-neutral handoff template').action(() => console.log(TEMPLATE));

  cmd.command('create')
    .description('Store a provider-neutral handoff from a file or stdin (Claude Code, Codex, OpenCode, or any agent)')
    .option('--input <file>', 'Handoff Markdown file')
    .option('--stdin', 'Read handoff Markdown from stdin')
    .option('--source-agent <agent>', 'Source agent when importing plain Markdown', 'external')
    .option('--task <task>', 'Override the task inferred from the Markdown heading')
    .action((opts: { input?: string; stdin?: boolean; sourceAgent: string; task?: string }) => {
      if ((opts.input ? 1 : 0) + (opts.stdin ? 1 : 0) !== 1) {
        console.error('Choose exactly one of --input <file> or --stdin.');
        process.exit(1);
      }
      const content = opts.stdin ? readFileSync(0, 'utf8') : decodeText(readFileSync(opts.input!));
      const handoff = createHandoff(rootOrExit(), content, { sourceAgent: opts.sourceAgent, task: opts.task });
      console.log(`Created: ${handoff.id}`);
      console.log(`Stored: ${handoff.filePath}`);
    });

  cmd.command('list').description('List stored handoffs').action(() => {
    const root = rootOrExit();
    const handoffs = loadHandoffs(getHandoffsDir(root));
    if (!handoffs.length) return console.log('No handoffs recorded yet.');
    for (const handoff of handoffs) console.log(`${handoff.id}\t${handoff.status}\t${handoff.sourceAgent}\t${handoff.task}`);
  });

  cmd.command('show <id>').description('Show a stored handoff').action((id: string) => {
    const handoff = findHandoff(rootOrExit(), id);
    if (!handoff) { console.error(`Unknown handoff: ${id}`); process.exit(1); }
    console.log(readFileSync(handoff!.filePath, 'utf8'));
  });

  cmd.command('complete <id>').description('Mark a handoff completed').action((id: string) => {
    const handoff = findHandoff(rootOrExit(), id);
    if (!handoff) { console.error(`Unknown handoff: ${id}`); process.exit(1); }
    updateHandoffStatus(handoff!, 'completed');
    console.log(`${id}: completed`);
  });

  cmd.command('supersede <id>').description('Mark a handoff superseded').action((id: string) => {
    const handoff = findHandoff(rootOrExit(), id);
    if (!handoff) { console.error(`Unknown handoff: ${id}`); process.exit(1); }
    updateHandoffStatus(handoff!, 'superseded');
    console.log(`${id}: superseded`);
  });

  cmd.command('validate').description('Validate all handoffs').option('--strict', 'Check linked files').action((opts: { strict?: boolean }) => {
    const root = rootOrExit();
    const projectRoot = dirname(root);
    const files = listHandoffFiles(getHandoffsDir(root));
    const handoffs = loadHandoffs(getHandoffsDir(root));
    const ids = new Set<string>();
    const errors: string[] = [];
    const parsedPaths = new Set(handoffs.map(handoff => handoff.filePath));
    for (const file of files) if (!parsedPaths.has(file)) errors.push(`invalid frontmatter: ${file}`);
    for (const handoff of handoffs) {
      if (ids.has(handoff.id)) errors.push(`duplicate id: ${handoff.id}`);
      ids.add(handoff.id);
      for (const error of validateHandoff(handoff, projectRoot, opts.strict)) errors.push(`${handoff.id}: ${error}`);
    }
    if (errors.length) { errors.forEach(error => console.error(`  ✗ ${error}`)); console.log(`✗ Found ${errors.length} issue(s)`); process.exit(1); }
    console.log(`✓ Valid: ${handoffs.length} handoffs, no issues`);
  });
  return cmd;
}

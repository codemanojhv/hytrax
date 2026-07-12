import { Command } from 'commander';
import { findHytraxRoot, getKnowledgeDir } from '../../utils/paths.js';
import { scaffoldOKF } from '../../knowledge/scaffold.js';
import type { OKFType } from '../../knowledge/types.js';

const VALID_TYPES = ['architecture', 'decision', 'constraint', 'convention', 'workflow', 'api', 'feature', 'preference'];

export function knowledgeCommand(): Command {
  const cmd = new Command('knowledge')
    .description('Manage project knowledge');

  cmd
    .command('add')
    .description('Scaffold a new knowledge object')
    .requiredOption('--type <type>', `Type: ${VALID_TYPES.join(', ')}`)
    .requiredOption('--title <title>', 'Human-readable title')
    .action((opts: any) => {
      const type = opts.type as string;
      if (!VALID_TYPES.includes(type)) {
        console.error(`Invalid type. Valid: ${VALID_TYPES.join(', ')}`);
        process.exit(1);
      }

      const root = findHytraxRoot();
      if (!root) {
        console.error('No .hytrax/ found. Run: npx hytrax init');
        process.exit(1);
      }

      const knowledgeDir = getKnowledgeDir(root);
      const filePath = scaffoldOKF(knowledgeDir, type as OKFType, opts.title);

      console.log(`Created: ${filePath}`);
      console.log('Fill in the details (summary, tags, files, body).');
    });

  return cmd;
}

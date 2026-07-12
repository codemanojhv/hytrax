import { Command } from 'commander';
import { search } from '../../search/engine.js';
import { findHytraxRoot } from '../../utils/paths.js';
import { formatQueryTable } from '../../utils/format.js';
import { loadConfig } from '../../config/loader.js';

export function queryCommand(): Command {
  return new Command('query')
    .description('Search project knowledge and outcomes (human-readable)')
    .argument('<query>', 'Search query')
    .option('--max <n>', 'Maximum results', parseInt)
    .action((query: string, opts: any) => {
      const root = findHytraxRoot();
      if (!root) {
        console.error('No .hytrax/ found.');
        process.exit(1);
      }

      const config = loadConfig();
      const max = opts.max ?? config.search.max_results;

      const results = search(root, query, { max });
      console.log(formatQueryTable(results));
    });
}

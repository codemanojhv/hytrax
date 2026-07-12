import { Command } from 'commander';
import { search } from '../../search/engine.js';
import { findHytraxRoot } from '../../utils/paths.js';
import { formatSearchYaml } from '../../utils/format.js';
import { loadConfig } from '../../config/loader.js';

export function searchCommand(): Command {
  return new Command('search')
    .description('Search project knowledge and outcomes')
    .argument('<query>', 'Search query (tags, keywords)')
    .option('--max <n>', 'Maximum results', parseInt, 10)
    .option('--type <type>', 'Filter by knowledge type (architecture, decision, constraint, etc.)')
    .option('--no-knowledge', 'Exclude knowledge results')
    .option('--no-outcomes', 'Exclude outcome results')
    .action((query: string, opts: any) => {
      const root = findHytraxRoot();
      if (!root) {
        console.error('No .hytrax/ found in this project. Run: npx hytrax init');
        process.exit(1);
      }

      const config = loadConfig();
      const max = opts.max ?? config.search.max_results;

      const results = search(root, query, {
        max,
        includeKnowledge: opts.knowledge !== false,
        includeOutcomes: opts.outcomes !== false,
        filterType: opts.type,
      });

      console.log(formatSearchYaml(results));
    });
}

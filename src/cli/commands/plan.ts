import { Command } from 'commander';
import { search } from '../../search/engine.js';
import { findHytraxRoot } from '../../utils/paths.js';

export function planCommand(): Command {
  return new Command('plan')
    .description('Prepare execution environment for a task (orchestrates multiple searches)')
    .argument('<task>', 'Task description')
    .action((task: string) => {
      const root = findHytraxRoot();
      if (!root) {
        console.error('No .hytrax/ found. Run: npx hytrax init');
        process.exit(1);
      }

      // Extract primary keywords from task
      const keywords = task
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2)
        .filter(w => !['the', 'and', 'for', 'this', 'that', 'with', 'from'].includes(w))
        .slice(0, 5)
        .join(' ');

      console.error(`[hytrax] Planning: ${task}`);
      console.error(`[hytrax] Keywords: ${keywords}`);

      // Search knowledge
      const knowledgeResults = search(root, keywords, {
        max: 5,
        includeKnowledge: true,
        includeOutcomes: false,
      });

      // Search outcomes for failures
      const outcomeResults = search(root, keywords, {
        max: 3,
        includeKnowledge: false,
        includeOutcomes: true,
      });

      // Search for constraints
      const constraintResults = search(root, 'constraint', {
        max: 5,
        includeKnowledge: true,
        includeOutcomes: false,
        filterType: 'constraint',
      });

      // Compress into manifest
      const lines: string[] = [];
      lines.push(`task: ${task}`);

      if (knowledgeResults.knowledge.length > 0) {
        lines.push('knowledge:');
        for (const doc of knowledgeResults.knowledge) {
          lines.push(`  - ${doc.metadata.title}  (${doc.metadata.type})`);
        }
      }

      if (outcomeResults.outcomes.length > 0) {
        const failures = outcomeResults.outcomes.filter(
          o => o.status === 'REJECTED' || o.status === 'FAILED',
        );
        if (failures.length > 0) {
          lines.push('avoid:');
          for (const o of failures) {
            lines.push(`  - ${o.reason || o.task}  (${o.status})`);
          }
        }
      }

      if (constraintResults.knowledge.length > 0) {
        lines.push('constraints:');
        for (const doc of constraintResults.knowledge) {
          lines.push(`  - ${doc.metadata.title}`);
        }
      }

      lines.push('verify:');
      lines.push('  - build');
      lines.push('  - lint');

      console.log(lines.join('\n'));
    });
}

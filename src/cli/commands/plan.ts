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

      // Search knowledge
      const knowledgeResults = search(root, keywords, {
        max: 5,
        includeKnowledge: true,
        includeOutcomes: false,
      });

      // Search outcomes for patterns + failures
      const outcomeResults = search(root, keywords, {
        max: 5,
        includeKnowledge: false,
        includeOutcomes: true,
      });

      // Search for constraints (always fetched, regardless of task)
      const constraintResults = search(root, 'constraint', {
        max: 10,
        includeKnowledge: true,
        includeOutcomes: false,
        filterType: 'constraint',
      });

      // Compress into manifest — pure YAML, noise-free
      const lines: string[] = [];
      lines.push(`task: ${task}`);

      // Related knowledge (architecture, conventions, workflows)
      if (knowledgeResults.knowledge.length > 0) {
        lines.push('knowledge:');
        for (const doc of knowledgeResults.knowledge) {
          lines.push(`  - ${doc.metadata.title}  (${doc.metadata.type})`);
        }
      }

      // Things to avoid: FAILED or REJECTED outcomes (excluding SUPERSEDED)
      const failures = outcomeResults.outcomes.filter(
        o => (o.status === 'REJECTED' || o.status === 'FAILED'),
      );
      if (failures.length > 0) {
        lines.push('avoid:');
        for (const o of failures) {
          lines.push(`  - ${o.reason || o.task}  (${o.status})`);
        }
      }

      // Positive patterns: ACCEPTED or VERIFIED outcomes that worked
      const patterns = outcomeResults.outcomes.filter(
        o => (o.status === 'ACCEPTED' || o.status === 'VERIFIED'),
      );
      if (patterns.length > 0) {
        lines.push('patterns:');
        for (const o of patterns) {
          lines.push(`  - ${o.approach || o.task}  (${o.status})`);
        }
      }

      // Mandatory constraints
      if (constraintResults.knowledge.length > 0) {
        lines.push('constraints:');
        for (const doc of constraintResults.knowledge) {
          lines.push(`  - ${doc.metadata.title}`);
        }
      }

      // Standard verification steps
      lines.push('verify:');
      lines.push('  - build');
      lines.push('  - lint');

      // All output to stdout — clean for AI consumption
      console.log(lines.join('\n'));
    });
}

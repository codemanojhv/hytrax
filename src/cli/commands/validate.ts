import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { findHytraxRoot, getKnowledgeDir, getOutcomesFile } from '../../utils/paths.js';
import { loadAllOKF } from '../../knowledge/parser.js';
import { loadOutcomes } from '../../outcomes/reader.js';

export function validateCommand(): Command {
  return new Command('validate')
    .description('Check .hytrax/ integrity')
    .option('--strict', 'Fail on stale generated constraints and missing linked files')
    .action((opts: { strict?: boolean }) => {
      const root = findHytraxRoot();
      if (!root) {
        console.log('No .hytrax/ found in this project.');
        process.exit(1);
      }

      const knowledgeDir = getKnowledgeDir(root);
      const projectRoot = dirname(root);
      const docs = loadAllOKF(knowledgeDir);
      const outcomes = loadOutcomes(getOutcomesFile(root));
      const superseded = new Set(outcomes.filter(o => o.status === 'SUPERSEDED').map(o => o.id.replace('out-', 'con-')));

      let errors = 0;
      const ids = new Set<string>();

      for (const doc of docs) {
        // Check duplicate IDs
        if (ids.has(doc.metadata.id)) {
          console.error(`  \u2717 Duplicate ID: ${doc.metadata.id} in ${doc.filePath}`);
          errors++;
        }
        ids.add(doc.metadata.id);

        // Check required fields
        if (!doc.metadata.title) {
          console.error(`  \u2717 Missing title in ${doc.filePath}`);
          errors++;
        }
        if (doc.metadata.tags.length === 0) {
          console.error(`  \u2717 No tags in ${doc.filePath} (${doc.metadata.id})`);
          errors++;
        }
        if (!['active', 'deprecated', 'superseded'].includes(doc.metadata.status)) {
          console.error(`  ✗ Invalid status in ${doc.filePath}: ${doc.metadata.status}`);
          errors++;
        }
        if (opts.strict && doc.metadata.status === 'active' && superseded.has(doc.metadata.id)) {
          console.error(`  ✗ Stale generated constraint: ${doc.metadata.id}`);
          errors++;
        }
        if (opts.strict) {
          for (const file of doc.metadata.files) {
            if (file && file !== '(add related files)' && !file.includes('*') && !existsSync(join(projectRoot, file))) {
              console.error(`  ✗ Missing linked file: ${file} (${doc.metadata.id})`);
              errors++;
            }
          }
        }
      }

      if (errors === 0) {
        console.log(`\u2713 Valid: ${docs.length} knowledge objects, no issues`);
      } else {
        console.log(`\u2717 Found ${errors} issue(s)`);
        process.exit(1);
      }
    });
}

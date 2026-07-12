import { Command } from 'commander';
import { findHytraxRoot, getKnowledgeDir } from '../../utils/paths.js';
import { loadAllOKF } from '../../knowledge/parser.js';

export function validateCommand(): Command {
  return new Command('validate')
    .description('Check .hytrax/ integrity')
    .action(() => {
      const root = findHytraxRoot();
      if (!root) {
        console.log('No .hytrax/ found in this project.');
        process.exit(1);
      }

      const knowledgeDir = getKnowledgeDir(root);
      const docs = loadAllOKF(knowledgeDir);

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
      }

      if (errors === 0) {
        console.log(`\u2713 Valid: ${docs.length} knowledge objects, no issues`);
      } else {
        console.log(`\u2717 Found ${errors} issue(s)`);
        process.exit(1);
      }
    });
}

import { Command } from 'commander';
import { existsSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { findHytraxRoot, getHandoffsDir, getKnowledgeDir, getOutcomesFile } from '../../utils/paths.js';
import { listOKFFiles, loadAllOKF, parseOKF } from '../../knowledge/parser.js';
import { loadOutcomes } from '../../outcomes/reader.js';
import { listHandoffFiles, loadHandoffs } from '../../handoff/parser.js';
import { validateHandoff } from '../../handoff/writer.js';

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

      const knowledgeDir = getKnowledgeDir(root!);
      const projectRoot = dirname(root!);
      const knowledgeFiles = listOKFFiles(knowledgeDir);
      const docs = loadAllOKF(knowledgeDir);
      const outcomes = loadOutcomes(getOutcomesFile(root!));
      const superseded = new Set(outcomes.filter(o => o.status === 'SUPERSEDED').map(o => o.id));
      let errors = 0;
      const ids = new Set<string>();

      for (const file of knowledgeFiles) {
        if (!parseOKF(file)) {
          console.error(`  \u2717 Invalid knowledge frontmatter: ${file}`);
          errors++;
        }
      }

      for (const doc of docs) {
        if (ids.has(doc.metadata.id)) {
          console.error(`  \u2717 Duplicate ID: ${doc.metadata.id} in ${doc.filePath}`);
          errors++;
        }
        ids.add(doc.metadata.id);
        if (!doc.metadata.title) { console.error(`  \u2717 Missing title in ${doc.filePath}`); errors++; }
        if (doc.metadata.tags.length === 0) { console.error(`  \u2717 No tags in ${doc.filePath} (${doc.metadata.id})`); errors++; }
        if (!['active', 'deprecated', 'superseded'].includes(doc.metadata.status)) {
          console.error(`  \u2717 Invalid status in ${doc.filePath}: ${doc.metadata.status}`);
          errors++;
        }
        if (opts.strict && doc.metadata.status === 'active' && doc.metadata.sourceOutcome && superseded.has(doc.metadata.sourceOutcome)) {
          console.error(`  \u2717 Stale generated constraint: ${doc.metadata.id}`);
          errors++;
        }
        if (opts.strict) {
          for (const file of doc.metadata.files) {
            if (file && file !== '(add related files)' && !file.includes('*') && !safeProjectFile(projectRoot, file)) {
              console.error(`  \u2717 Missing linked file: ${file} (${doc.metadata.id})`);
              errors++;
            }
          }
        }
      }

      const handoffDir = getHandoffsDir(root!);
      const handoffFiles = listHandoffFiles(handoffDir);
      const handoffs = loadHandoffs(handoffDir);
      const parsedHandoffPaths = new Set(handoffs.map(handoff => handoff.filePath));
      for (const file of handoffFiles) {
        if (!parsedHandoffPaths.has(file)) {
          console.error(`  \u2717 Invalid handoff frontmatter: ${file}`);
          errors++;
        }
      }
      const handoffIds = new Set<string>();
      for (const handoff of handoffs) {
        if (handoffIds.has(handoff.id)) { console.error(`  \u2717 Duplicate handoff ID: ${handoff.id}`); errors++; }
        handoffIds.add(handoff.id);
        for (const error of validateHandoff(handoff, projectRoot, Boolean(opts.strict))) {
          console.error(`  \u2717 ${handoff.id}: ${error}`);
          errors++;
        }
      }

      if (errors === 0) {
        console.log(`\u2713 Valid: ${docs.length} knowledge objects, ${handoffs.length} handoffs, no issues`);
      } else {
        console.log(`\u2717 Found ${errors} issue(s)`);
        process.exit(1);
      }
    });
}

function safeProjectFile(projectRoot: string, file: string): boolean {
  if (isAbsolute(file)) return false;
  const root = resolve(projectRoot);
  const target = resolve(projectRoot, file);
  const rel = relative(root, target);
  return rel !== '..' && !rel.startsWith('..') && existsSync(target);
}

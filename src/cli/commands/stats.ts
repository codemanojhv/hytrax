import { Command } from 'commander';
import { findHytraxRoot, getOutcomesFile } from '../../utils/paths.js';
import { loadOutcomes } from '../../outcomes/reader.js';
import { buildStats } from '../../outcomes/builder.js';

export function statsCommand(): Command {
  return new Command('stats')
    .description('Show outcome statistics')
    .action(() => {
      const root = findHytraxRoot();
      if (!root) {
        console.log('No .hytrax/ found.');
        process.exit(1);
      }

      const outcomesFile = getOutcomesFile(root);
      const outcomes = loadOutcomes(outcomesFile);

      if (outcomes.length === 0) {
        console.log('No outcomes recorded yet.');
        return;
      }

      const stats = buildStats(outcomes);

      console.log(`Outcomes: ${stats.total}`);
      console.log('');
      console.log('By status:');
      console.log(`  ACCEPTED:  ${stats.accepted}`);
      console.log(`  REJECTED:  ${stats.rejected}`);
      console.log(`  FAILED:    ${stats.failed}`);
      console.log(`  VERIFIED:  ${stats.verified}`);
      console.log(`  SUPERSEDED: ${stats.superseded}`);
      console.log('');
      console.log(`Acceptance rate: ${stats.acceptanceRate}`);
      console.log(`Failure rate:    ${stats.failureRate}`);
      console.log('');

      const areas = Object.entries(stats.byArea);
      if (areas.length > 0) {
        console.log('By area:');
        for (const [area, data] of areas.sort((a, b) => b[1].total - a[1].total)) {
          const failRate = data.total > 0 ? Math.round((data.failed / data.total) * 100) : 0;
          console.log(`  ${area}: ${data.total} outcomes, ${failRate}% failure rate`);
        }
        console.log('');
      }

      if (stats.recentFailures.length > 0) {
        console.log('Recent failures:');
        for (const f of stats.recentFailures) {
          console.log(`  ${f.id}: ${f.task} (${f.status}${f.reason ? ': ' + f.reason : ''})`);
        }
      }
    });
}

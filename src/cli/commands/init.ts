import { Command } from 'commander';
import { scaffoldHytrax } from '../../init/scaffold.js';

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize .hytrax/ in the current project')
    .action(() => {
      const result = scaffoldHytrax(process.cwd());

      if (result[0] === 'exists') {
        console.log('.hytrax/ already exists in this project. Nothing changed.');
        return;
      }

      console.log('Initialized Hytrax in this project:');
      for (const path of result) {
        console.log(`  \u2713 Created ${path}`);
      }
      console.log('');
      console.log('Next steps:');
      console.log('  1. Add knowledge to .hytrax/knowledge/');
      console.log('  2. Run: npx hytrax plan "your task"');
    });
}

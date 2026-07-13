import { Command } from 'commander';
import { installAgentInstructions, scaffoldHytrax } from '../../init/scaffold.js';

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize .hytrax/ in the current project')
    .option('--agent-instructions', 'Add the Hytrax workflow to AGENTS.md without replacing existing instructions')
    .action((opts: { agentInstructions?: boolean }) => {
      const result = scaffoldHytrax(process.cwd());

      if (result[0] === 'exists') {
        console.log('.hytrax/ already exists in this project.');
        if (opts.agentInstructions) console.log(`AGENTS.md: ${installAgentInstructions(process.cwd())}`);
        return;
      }

      console.log('Initialized Hytrax in this project:');
      for (const path of result) {
        console.log(`  \u2713 Created ${path}`);
      }
      if (opts.agentInstructions) console.log(`  ✓ AGENTS.md: ${installAgentInstructions(process.cwd())}`);
      console.log('');
      console.log('Next steps:');
      console.log('  1. Add knowledge to .hytrax/knowledge/');
      console.log('  2. Run: npx hytrax plan "your task"');
    });
}

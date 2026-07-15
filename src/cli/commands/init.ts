import { Command } from 'commander';
import { installAgentInstructions, installHytraxSkill, scaffoldHytrax } from '../../init/scaffold.js';

export function initCommand(): Command {
  return new Command('init')
    .description('Initialize .hytrax/ in the current project')
    .option('--agent-instructions [file]', 'Add the workflow to an agent instruction file (default: AGENTS.md)')
    .action((opts: { agentInstructions?: string | boolean }) => {
      const instructionFile = typeof opts.agentInstructions === 'string' ? opts.agentInstructions : 'AGENTS.md';
      const result = scaffoldHytrax(process.cwd());

      if (result[0] === 'exists') {
        console.log('.hytrax/ already exists in this project.');
        console.log(`  \u2713 Skill: ${installHytraxSkill(process.cwd())}`);
        if (opts.agentInstructions) console.log(`${instructionFile}: ${installAgentInstructions(process.cwd(), instructionFile)}`);
        return;
      }

      console.log('Initialized Hytrax in this project:');
      for (const path of result) console.log(`  \u2713 Created ${path}`);
      if (opts.agentInstructions) console.log(`  \u2713 ${instructionFile}: ${installAgentInstructions(process.cwd(), instructionFile)}`);
      console.log('');
      console.log('Next steps:');
      console.log('  1. Add knowledge to .hytrax/knowledge/');
      console.log('  2. Run: npx hytrax resume "your task"');
    });
}

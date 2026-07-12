#!/usr/bin/env node
import { createCLI } from './cli/index.js';

const program = createCLI();
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.help();
}

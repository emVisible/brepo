#!/usr/bin/env node
import { Command } from 'commander';
import { analyzeCommand } from './commands/analyze.js';
import { doctorCommand } from './commands/doctor.js';
import { diffCommand } from './commands/diff.js';
import { watchCommand } from './commands/watch.js';
import { cleanCommand } from './commands/clean.js';

const program = new Command();

program
  .name('brepo')
  .description('BriefRepo — 新员工的项目导航仪')
  .version('0.1.0');

program.addCommand(analyzeCommand);
program.addCommand(doctorCommand);
program.addCommand(diffCommand);
program.addCommand(watchCommand);
program.addCommand(cleanCommand);

program.parseAsync(process.argv);

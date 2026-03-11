#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { Ctx } from './context';
import { join } from 'path';
import { existsSync } from 'fs';
import { promises as fs } from 'fs';
import { createInterface } from 'readline';
import { isGitInstalled, isGitRepo, installHooks, removeHooks, getHookStatus, loadConfig, saveConfig } from './hooks';

function askQuestion(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

const program = new Command();

program
  .name('ctx')
  .description('Git for AI context and agent memory')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new ctx repository')
  .option('--no-hooks', 'Skip Git hooks prompt')
  .action(async (options) => {
    const ctx = new Ctx();
    try {
      await ctx.init();
      await ctx.createDefaultIgnoreFile();
      console.log(chalk.green('✅ Context repository initialized'));
      console.log(chalk.gray('📝 Created .ctxignore file - customize it to control what gets tracked'));
      
      // Git hooks detection
      const ctxDir = join(process.cwd(), '.ctx');
      
      if (options.hooks !== false && isGitInstalled() && isGitRepo(process.cwd())) {
        console.log('');
        console.log(chalk.blue('🔗 Git repository detected.'));
        console.log('');
        console.log(chalk.white('  Ctx can automatically record context when you commit or push code.'));
        console.log(chalk.white('  This creates a timeline of your project\'s evolution — every commit'));
        console.log(chalk.white('  and push becomes part of your project\'s memory.'));
        console.log('');
        
        const answer = await askQuestion(chalk.yellow('  Install Git hooks? (Y/n) '));
        
        if (answer === '' || answer === 'y' || answer === 'yes') {
          const result = await installHooks(process.cwd(), ctxDir);
          console.log(chalk.green(`✅ Git hooks installed: ${result.installed.join(', ')}`));
        } else {
          console.log(chalk.gray('  Skipped. You can install hooks later with: ctx hook install'));
          const config = await loadConfig(ctxDir);
          config.hooks_offered = true;
          await saveConfig(ctxDir, config);
        }
      } else if (!isGitInstalled() || !isGitRepo(process.cwd())) {
        // Save that we haven't offered hooks yet (Git not available)
        const config = await loadConfig(ctxDir);
        config.hooks_offered = false;
        await saveConfig(ctxDir, config);
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to initialize:', error));
      process.exit(1);
    } finally {
      await ctx.close();
    }
  });

program
  .command('log')
  .description('Record a new context event')
  .argument('<event>', 'Event type/name')
  .option('-d, --data <data>', 'Event data (JSON string)')
  .option('-a, --agent <agent>', 'Agent name')
  .option('-s, --session <session>', 'Session ID')
  .option('-c, --confidence <confidence>', 'Confidence score (0-1)')
  .option('-m, --model <model>', 'Model name')
  .option('-p, --prompt <prompt>', 'Prompt used')
  .action(async (event, options) => {
    try {
      if (!existsSync(join(process.cwd(), '.ctx'))) {
        console.error(chalk.red('❌ Not a ctx repository. Run "ctx init" first.'));
        process.exit(1);
      }

      const ctx = new Ctx();
      
      const record = {
        event,
        data: options.data ? JSON.parse(options.data) : undefined,
        agent: options.agent,
        session: options.session,
        confidence: options.confidence ? parseFloat(options.confidence) : undefined,
        model: options.model,
        prompt: options.prompt
      };

      const result = await ctx.record(record);
      console.log(chalk.green('✅ Event recorded:'), result.id);
      await ctx.close();
    } catch (error) {
      console.error(chalk.red('❌ Failed to log event:', error));
      process.exit(1);
    }
  });

program
  .command('query')
  .description('Query context events')
  .option('-t, --type <type>', 'Event type')
  .option('-a, --agent <agent>', 'Agent name')
  .option('-s, --session <session>', 'Session ID')
  .option('--since <since>', 'Since date (ISO string)')
  .option('--until <until>', 'Until date (ISO string)')
  .option('-l, --limit <limit>', 'Limit results', '10')
  .action(async (options) => {
    try {
      if (!existsSync(join(process.cwd(), '.ctx'))) {
        console.error(chalk.red('❌ Not a ctx repository. Run "ctx init" first.'));
        process.exit(1);
      }

      const ctx = new Ctx();
      
      const query = {
        type: options.type,
        agent: options.agent,
        session: options.session,
        since: options.since,
        until: options.until,
        limit: parseInt(options.limit)
      };

      const events = await ctx.query(query);
      
      if (events.length === 0) {
        console.log(chalk.yellow('No events found'));
      } else {
        console.log(chalk.blue(`Found ${events.length} events:\n`));
        
        events.forEach(event => {
          console.log(chalk.gray(event.timestamp));
          console.log(chalk.white(`${event.type}`));
          
          if (event.agent) console.log(chalk.cyan(`  Agent: ${event.agent}`));
          if (event.session) console.log(chalk.cyan(`  Session: ${event.session}`));
          if (event.model) console.log(chalk.cyan(`  Model: ${event.model}`));
          if (event.confidence) console.log(chalk.cyan(`  Confidence: ${event.confidence}`));
          if (event.data) console.log(chalk.cyan(`  Data:`), JSON.stringify(event.data, null, 2));
          if (event.prompt) console.log(chalk.cyan(`  Prompt:`), event.prompt);
          
          console.log('');
        });
      }
      
      await ctx.close();
    } catch (error) {
      console.error(chalk.red('❌ Failed to query events:', error));
      process.exit(1);
    }
  });

program
  .command('inspect')
  .description('Show recent events')
  .option('-t, --type <type>', 'Event type')
  .option('-l, --limit <limit>', 'Limit results', '10')
  .action(async (options) => {
    try {
      if (!existsSync(join(process.cwd(), '.ctx'))) {
        console.error(chalk.red('❌ Not a ctx repository. Run "ctx init" first.'));
        process.exit(1);
      }

      const ctx = new Ctx();
      const events = await ctx.last(options.type, parseInt(options.limit));
      
      if (events.length === 0) {
        console.log(chalk.yellow('No events found'));
      } else {
        console.log(chalk.blue(`Recent ${events.length} events:\n`));
        
        events.forEach((event, index) => {
          console.log(chalk.gray(`${index + 1}. ${event.timestamp}`));
          console.log(chalk.white(`   ${event.type}`));
          if (event.agent) console.log(chalk.cyan(`   Agent: ${event.agent}`));
          console.log('');
        });
      }
      
      await ctx.close();
    } catch (error) {
      console.error(chalk.red('❌ Failed to inspect events:', error));
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show ctx repository status')
  .action(async () => {
    try {
      const ctxDir = join(process.cwd(), '.ctx');
      
      if (!existsSync(ctxDir)) {
        console.log(chalk.red('❌ Not a ctx repository'));
        return;
      }

      const ctx = new Ctx();
      const allEvents = await ctx.query({ limit: 1000 });
      const agents = new Set(allEvents.filter(e => e.agent).map(e => e.agent));
      const sessions = new Set(allEvents.filter(e => e.session).map(e => e.session));
      const types = new Set(allEvents.map(e => e.type));
      
      console.log(chalk.green('✅ Ctx repository'));
      console.log(chalk.gray(`Location: ${ctxDir}`));
      console.log(chalk.gray(`Total events: ${allEvents.length}`));
      console.log(chalk.gray(`Event types: ${types.size > 0 ? [...types].join(', ') : 'none'}`));
      console.log(chalk.gray(`Agents: ${agents.size > 0 ? [...agents].join(', ') : 'none'}`));
      console.log(chalk.gray(`Sessions: ${sessions.size > 0 ? [...sessions].join(', ') : 'none'}`));
      
      if (allEvents.length > 0) {
        console.log(chalk.gray(`Latest: ${allEvents[0].timestamp} — ${allEvents[0].type}`));
      }
      
      await ctx.close();
    } catch (error) {
      console.error(chalk.red('❌ Failed to get status:', error));
      process.exit(1);
    }
  });

program
  .command('ignore')
  .description('Manage .ctxignore patterns')
  .argument('[pattern]', 'Pattern to ignore (use --remove to delete)')
  .option('-r, --remove', 'Remove pattern instead of adding')
  .option('-l, --list', 'List current ignore patterns')
  .action(async (pattern, options) => {
    try {
      if (!existsSync(join(process.cwd(), '.ctx'))) {
        console.error(chalk.red('❌ Not a ctx repository. Run "ctx init" first.'));
        process.exit(1);
      }

      const ctx = new Ctx();
      const ignorePath = join(process.cwd(), '.ctx', '.ctxignore');
      
      if (options.list) {
        const content = await fs.readFile(ignorePath, 'utf-8');
        console.log(chalk.blue('Current ignore patterns:\n'));
        content.split('\n').forEach((line: string) => {
          if (line.trim()) console.log(`  ${line}`);
        });
        await ctx.close();
        return;
      }
      
      if (!pattern) {
        console.error(chalk.red('❌ Please provide a pattern or use --list'));
        process.exit(1);
      }
      
      let content = await fs.readFile(ignorePath, 'utf-8');
      const lines = content.split('\n');
      
      if (options.remove) {
        const filtered = lines.filter((line: string) => line.trim() !== pattern);
        await fs.writeFile(ignorePath, filtered.join('\n'));
        console.log(chalk.green(`✅ Removed pattern: ${pattern}`));
      } else {
        if (!lines.includes(pattern)) {
          await fs.appendFile(ignorePath, `\n${pattern}`);
          console.log(chalk.green(`✅ Added pattern: ${pattern}`));
        } else {
          console.log(chalk.yellow(`⚠️  Pattern already exists: ${pattern}`));
        }
      }
      
      await ctx.close();
    } catch (error) {
      console.error(chalk.red('❌ Failed to manage ignore patterns:', error));
      process.exit(1);
    }
  });

const hook = program
  .command('hook')
  .description('Manage Git hooks for automatic context recording');

hook
  .command('install')
  .description('Install Git hooks (post-commit + pre-push)')
  .action(async () => {
    try {
      const ctxDir = join(process.cwd(), '.ctx');
      
      if (!existsSync(ctxDir)) {
        console.error(chalk.red('❌ Not a ctx repository. Run "ctx init" first.'));
        process.exit(1);
      }
      
      if (!isGitInstalled()) {
        console.error(chalk.red('❌ Git is not installed on this system.'));
        process.exit(1);
      }
      
      if (!isGitRepo(process.cwd())) {
        console.error(chalk.red('❌ Not a Git repository. Run "git init" first.'));
        process.exit(1);
      }
      
      const result = await installHooks(process.cwd(), ctxDir);
      console.log(chalk.green(`✅ Git hooks installed: ${result.installed.join(', ')}`));
      console.log(chalk.gray('  Ctx will now record context on every commit and push.'));
    } catch (error) {
      console.error(chalk.red('❌ Failed to install hooks:', error));
      process.exit(1);
    }
  });

hook
  .command('remove')
  .description('Remove Ctx Git hooks')
  .action(async () => {
    try {
      const ctxDir = join(process.cwd(), '.ctx');
      
      if (!isGitRepo(process.cwd())) {
        console.error(chalk.red('❌ Not a Git repository.'));
        process.exit(1);
      }
      
      const result = await removeHooks(process.cwd(), ctxDir);
      if (result.removed.length > 0) {
        console.log(chalk.green(`✅ Git hooks removed: ${result.removed.join(', ')}`));
      } else {
        console.log(chalk.yellow('No Ctx hooks found to remove.'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to remove hooks:', error));
      process.exit(1);
    }
  });

hook
  .command('status')
  .description('Show which Ctx Git hooks are installed')
  .action(async () => {
    try {
      if (!isGitRepo(process.cwd())) {
        console.log(chalk.yellow('Not a Git repository.'));
        return;
      }
      
      const status = await getHookStatus(process.cwd());
      
      console.log(chalk.blue('Git Hook Status:\n'));
      console.log(`  post-commit: ${status.postCommit ? chalk.green('✅ installed') : chalk.gray('not installed')}`);
      console.log(`  pre-push:    ${status.prePush ? chalk.green('✅ installed') : chalk.gray('not installed')}`);
      
      if (!status.postCommit && !status.prePush) {
        console.log(chalk.gray('\n  Run "ctx hook install" to enable automatic context recording.'));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to check hook status:', error));
      process.exit(1);
    }
  });

program.parse();

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

const CTX_HOOK_START = '# ctx-hook-start';
const CTX_HOOK_END = '# ctx-hook-end';

export interface CtxConfig {
  hooks_installed: boolean;
  hooks_offered: boolean;
  created_at: string;
  version: string;
}

export function isGitInstalled(): boolean {
  try {
    execSync('git --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function isGitRepo(cwd: string): boolean {
  return existsSync(join(cwd, '.git'));
}

export function findGitRoot(cwd: string): string | null {
  try {
    const root = execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore']
    }).trim();
    return root;
  } catch {
    return null;
  }
}

function getPostCommitScript(ctxDir: string): string {
  return `${CTX_HOOK_START}
# Ctx: Auto-record git commits as context events
if [ -d "${ctxDir}" ]; then
  HASH=$(git rev-parse --short HEAD 2>/dev/null)
  MESSAGE=$(git log -1 --pretty=%s 2>/dev/null)
  AUTHOR=$(git log -1 --pretty=%an 2>/dev/null)
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  FILES=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null | tr '\\n' ',' | sed 's/,$//')
  
  # Run in background so git isn't slowed down
  (ctx record git_commit -d "{\\"hash\\":\\"$HASH\\",\\"message\\":\\"$MESSAGE\\",\\"author\\":\\"$AUTHOR\\",\\"branch\\":\\"$BRANCH\\",\\"files_changed\\":\\"$FILES\\"}" -a git 2>/dev/null || true &)
fi
${CTX_HOOK_END}`;
}

function getPrePushScript(ctxDir: string): string {
  return `${CTX_HOOK_START}
# Ctx: Auto-record git pushes as context events
if [ -d "${ctxDir}" ]; then
  REMOTE="$1"
  URL="$2"
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
  COUNT=$(git log --oneline @{u}..HEAD 2>/dev/null | wc -l | tr -d ' ')
  
  # Run synchronously so we record before code leaves the machine
  ctx record git_push -d "{\\"remote\\":\\"$REMOTE\\",\\"branch\\":\\"$BRANCH\\",\\"commits_pushed\\":$COUNT}" -a git 2>/dev/null || true
fi
${CTX_HOOK_END}`;
}

export async function loadConfig(ctxDir: string): Promise<CtxConfig> {
  const configPath = join(ctxDir, 'config.json');
  
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {
      hooks_installed: false,
      hooks_offered: false,
      created_at: new Date().toISOString(),
      version: '0.1.0'
    };
  }
}

export async function saveConfig(ctxDir: string, config: CtxConfig): Promise<void> {
  const configPath = join(ctxDir, 'config.json');
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function installHooks(cwd: string, ctxDir: string): Promise<{ installed: string[] }> {
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) {
    throw new Error('Not a Git repository');
  }
  
  const hooksDir = join(gitRoot, '.git', 'hooks');
  await fs.mkdir(hooksDir, { recursive: true });
  
  const installed: string[] = [];
  
  // Install post-commit hook
  const postCommitPath = join(hooksDir, 'post-commit');
  await appendHook(postCommitPath, getPostCommitScript(ctxDir));
  installed.push('post-commit');
  
  // Install pre-push hook
  const prePushPath = join(hooksDir, 'pre-push');
  await appendHook(prePushPath, getPrePushScript(ctxDir));
  installed.push('pre-push');
  
  // Update config
  const config = await loadConfig(ctxDir);
  config.hooks_installed = true;
  config.hooks_offered = true;
  await saveConfig(ctxDir, config);
  
  return { installed };
}

export async function removeHooks(cwd: string, ctxDir: string): Promise<{ removed: string[] }> {
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) {
    throw new Error('Not a Git repository');
  }
  
  const hooksDir = join(gitRoot, '.git', 'hooks');
  const removed: string[] = [];
  
  for (const hookName of ['post-commit', 'pre-push']) {
    const hookPath = join(hooksDir, hookName);
    if (await removeHookSection(hookPath)) {
      removed.push(hookName);
    }
  }
  
  // Update config
  const config = await loadConfig(ctxDir);
  config.hooks_installed = false;
  await saveConfig(ctxDir, config);
  
  return { removed };
}

export async function getHookStatus(cwd: string): Promise<{ postCommit: boolean; prePush: boolean }> {
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) {
    return { postCommit: false, prePush: false };
  }
  
  const hooksDir = join(gitRoot, '.git', 'hooks');
  
  return {
    postCommit: await hasCtxHook(join(hooksDir, 'post-commit')),
    prePush: await hasCtxHook(join(hooksDir, 'pre-push'))
  };
}

async function appendHook(hookPath: string, script: string): Promise<void> {
  let content = '';
  
  if (existsSync(hookPath)) {
    content = await fs.readFile(hookPath, 'utf-8');
    
    // If ctx hook already exists, remove it first
    if (content.includes(CTX_HOOK_START)) {
      content = removeCtxSection(content);
    }
  } else {
    content = '#!/bin/sh\n';
  }
  
  // Append ctx hook
  content = content.trimEnd() + '\n\n' + script + '\n';
  
  await fs.writeFile(hookPath, content);
  await fs.chmod(hookPath, 0o755);
}

async function removeHookSection(hookPath: string): Promise<boolean> {
  if (!existsSync(hookPath)) return false;
  
  const content = await fs.readFile(hookPath, 'utf-8');
  if (!content.includes(CTX_HOOK_START)) return false;
  
  const cleaned = removeCtxSection(content).trim();
  
  // If only the shebang remains, remove the file entirely
  if (cleaned === '#!/bin/sh' || cleaned === '') {
    await fs.unlink(hookPath);
  } else {
    await fs.writeFile(hookPath, cleaned + '\n');
  }
  
  return true;
}

function removeCtxSection(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inCtxSection = false;
  
  for (const line of lines) {
    if (line.trim() === CTX_HOOK_START) {
      inCtxSection = true;
      continue;
    }
    if (line.trim() === CTX_HOOK_END) {
      inCtxSection = false;
      continue;
    }
    if (!inCtxSection) {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

async function hasCtxHook(hookPath: string): Promise<boolean> {
  if (!existsSync(hookPath)) return false;
  
  try {
    const content = await fs.readFile(hookPath, 'utf-8');
    return content.includes(CTX_HOOK_START);
  } catch {
    return false;
  }
}

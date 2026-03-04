#!/usr/bin/env node
import { cp, mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

type SkillInfo = {
  name: string;
  description: string;
  sourceDir: string;
  category: string;
  sourceRef: string;
  isReleaseSkill?: boolean;
};

type Frontmatter = Record<string, string>;

type MigrateResult = {
  name: string;
  category: string;
  sourceDir: string;
  targetDir: string;
  hasScripts: boolean;
  hasReferences: boolean;
  hasPrompts: boolean;
  externalDependencies: string[];
  envVars: string[];
  riskLevel: 'low' | 'medium' | 'high';
  filesCopied: string[];
};

function parseFrontmatter(md: string): { frontmatter: Frontmatter; body: string } {
  const match = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: md };
  }

  const raw = match[1].split('\n');
  const frontmatter: Frontmatter = {};
  for (const line of raw) {
    const kv = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    frontmatter[kv[1]] = kv[2].trim();
  }

  return { frontmatter, body: match[2] };
}

function detectEnvVars(content: string): string[] {
  const found = new Set<string>();
  const regex = /\b([A-Z][A-Z0-9_]{2,})\b/g;
  for (const m of content.matchAll(regex)) {
    const key = m[1];
    if (
      key.includes('API') ||
      key.includes('TOKEN') ||
      key.includes('KEY') ||
      key.includes('CHROME') ||
      key.includes('URL_') ||
      key.includes('BASE_URL') ||
      key.includes('HOME')
    ) {
      found.add(key);
    }
  }
  return [...found].sort();
}

function dedupe<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function detectExternalDependencies(name: string, content: string): string[] {
  const deps: string[] = [];
  if (content.includes('npx -y bun') || name.includes('format-markdown') || name.includes('post-to-x')) deps.push('bun');
  if (/\bChrome\b|\bCDP\b|browser automation|cookie/i.test(content)) deps.push('chrome');
  if (/OpenAI|Google|DashScope|Replicate|Gemini|API key/i.test(content)) deps.push('external-ai-api');
  if (/WeChat|微信公众号|X \(Twitter\)|x\.com|twitter\.com/i.test(content)) deps.push('social-platform-access');
  return dedupe(deps);
}

function inferRiskLevel(deps: string[], content: string): 'low' | 'medium' | 'high' {
  if (deps.includes('social-platform-access') || /danger-|reverse-engineered|cookie/i.test(content)) return 'high';
  if (deps.includes('chrome') || deps.includes('external-ai-api')) return 'medium';
  return 'low';
}

function inferAllowedTools(deps: string[]): string[] {
  const base = ['read', 'write', 'bash'];
  if (deps.includes('chrome')) base.push('browser');
  if (deps.includes('external-ai-api') || deps.includes('social-platform-access')) base.push('network');
  return dedupe(base);
}

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

function renderFrontmatter(params: {
  name: string;
  description: string;
  sourceRef: string;
  allowedTools: string[];
}): string {
  const lines = [
    '---',
    `name: ${params.name}`,
    `description: ${params.description}`,
    `identifier: openclaw/${params.name}`,
    `source: migrated-from-${params.sourceRef}`,
    'argument-hint: Accepts file paths, URLs, and CLI flags compatible with original baoyu skill workflows.',
    'allowed-tools:',
    ...params.allowedTools.map((t) => `  - ${t}`),
    'tags:',
    '  - migrated',
    '  - baoyu',
    '  - openclaw',
    '---',
    '',
  ];
  return lines.join('\n');
}

function renderMigrationNotes(opts: {
  hasScripts: boolean;
  hasReferences: boolean;
  hasPrompts: boolean;
  deps: string[];
  envVars: string[];
  risk: 'low' | 'medium' | 'high';
}): string {
  const deps = opts.deps.length ? opts.deps.join(', ') : 'none';
  const env = opts.envVars.length ? opts.envVars.map((x) => `\`${x}\``).join(', ') : 'none detected';
  return [
    '',
    '## OpenClaw Migration Notes',
    '',
    '- Migration mode: OpenClaw native first',
    '- Preserved directories:',
    `  - scripts: ${opts.hasScripts ? 'yes' : 'no'}`,
    `  - references: ${opts.hasReferences ? 'yes' : 'no'}`,
    `  - prompts: ${opts.hasPrompts ? 'yes' : 'no'}`,
    `- External dependencies: ${deps}`,
    `- Risk level: ${opts.risk}`,
    `- Environment variables (detected): ${env}`,
    '- Config compatibility: keep original `.baoyu-skills/<skill>/EXTEND.md` behavior and add OpenClaw-compatible path in runtime wrappers when needed.',
    '',
  ].join('\n');
}

function renderPreflightAndFallback(opts: {
  deps: string[];
  envVars: string[];
  risk: 'low' | 'medium' | 'high';
}): string {
  const checks: string[] = [];
  checks.push('- Confirm `bun` is available when script examples use `npx -y bun ...`.');
  if (opts.deps.includes('chrome')) checks.push('- Confirm Chrome is installed and launchable for CDP/browser automation flows.');
  if (opts.deps.includes('external-ai-api')) checks.push('- Confirm required API credentials are exported before execution.');
  if (opts.deps.includes('social-platform-access')) checks.push('- Confirm account session/cookies are valid before posting or scraping operations.');

  const fallbacks: string[] = [];
  fallbacks.push('- If runtime dependency is missing, stop execution and return exact install/setup command.');
  if (opts.deps.includes('external-ai-api')) fallbacks.push('- If API call fails, suggest retry with explicit provider/model flags and validate key scope.');
  if (opts.deps.includes('chrome')) fallbacks.push('- If browser automation fails, switch to manual/wait mode where available.');
  if (opts.deps.includes('social-platform-access')) fallbacks.push('- If platform blocks automation, return manual publish/export instructions instead of retry loops.');
  if (opts.risk === 'high') fallbacks.push('- For high-risk workflows, require explicit user confirmation before irreversible actions.');

  const env = opts.envVars.length ? opts.envVars.map((x) => '`' + x + '`').join(', ') : 'none detected';
  return [
    '## OpenClaw Preflight Checks',
    '',
    ...checks,
    '',
    `Detected env vars: ${env}`,
    '',
    '## OpenClaw Failure Fallback',
    '',
    ...fallbacks,
    '',
  ].join('\n');
}

export async function migrateSkill(info: SkillInfo, targetRoot: string): Promise<MigrateResult> {
  const targetDir = path.join(targetRoot, 'skills', info.name);
  await mkdir(targetDir, { recursive: true });

  const srcSkillMd = path.join(info.sourceDir, 'SKILL.md');
  const raw = await readFile(srcSkillMd, 'utf-8');
  const parsed = parseFrontmatter(raw);

  const name = parsed.frontmatter.name || info.name;
  const description = parsed.frontmatter.description || info.description;

  const hasScripts = await exists(path.join(info.sourceDir, 'scripts'));
  const hasReferences = await exists(path.join(info.sourceDir, 'references'));
  const hasPrompts = await exists(path.join(info.sourceDir, 'prompts'));

  const deps = detectExternalDependencies(name, raw);
  const envVars = detectEnvVars(raw);
  const risk = inferRiskLevel(deps, raw);
  const allowedTools = inferAllowedTools(deps);

  const frontmatter = renderFrontmatter({
    name,
    description,
    sourceRef: info.sourceRef,
    allowedTools,
  });

  const merged = `${frontmatter}${parsed.body.trimEnd()}${renderMigrationNotes({
    hasScripts,
    hasReferences,
    hasPrompts,
    deps,
    envVars,
    risk,
  })}${renderPreflightAndFallback({
    deps,
    envVars,
    risk,
  })}`;

  await writeFile(path.join(targetDir, 'SKILL.md'), merged + '\n', 'utf-8');

  const filesCopied: string[] = ['SKILL.md'];

  if (hasScripts) {
    await cp(path.join(info.sourceDir, 'scripts'), path.join(targetDir, 'scripts'), { recursive: true });
    filesCopied.push('scripts/**');
  }

  if (hasReferences) {
    await cp(path.join(info.sourceDir, 'references'), path.join(targetDir, 'references'), { recursive: true });
    filesCopied.push('references/**');
  }

  if (hasPrompts) {
    await cp(path.join(info.sourceDir, 'prompts'), path.join(targetDir, 'prompts'), { recursive: true });
    filesCopied.push('prompts/**');
  }

  return {
    name,
    category: info.category,
    sourceDir: info.sourceDir,
    targetDir,
    hasScripts,
    hasReferences,
    hasPrompts,
    externalDependencies: deps,
    envVars,
    riskLevel: risk,
    filesCopied,
  };
}

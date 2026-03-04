#!/usr/bin/env node
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { migrateSkill } from './migrate-skill.ts';

type Marketplace = {
  plugins: Array<{
    name: string;
    skills: string[];
  }>;
};

type SkillInventoryItem = {
  name: string;
  category: string;
  source_dir: string;
  source_ref: string;
  has_scripts: boolean;
  has_references: boolean;
  has_prompts: boolean;
  external_dependencies: string[];
  env_vars: string[];
  risk_level: 'low' | 'medium' | 'high';
};

const cwd = process.cwd();
const targetRoot = cwd;
const upstreamRoot = path.resolve(cwd, '..', 'upstream-baoyu-skills');
const inventoryOnly = process.argv.includes('--inventory-only');

async function exists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function getUpstreamSha(): Promise<string> {
  const head = await readFile(path.join(upstreamRoot, '.git', 'HEAD'), 'utf-8');
  const ref = head.trim().replace('ref: ', '');
  if (ref.startsWith('refs/')) {
    return (await readFile(path.join(upstreamRoot, '.git', ref), 'utf-8')).trim();
  }
  return head.trim();
}

async function loadMarketplace(): Promise<Marketplace> {
  const raw = await readFile(path.join(upstreamRoot, '.claude-plugin', 'marketplace.json'), 'utf-8');
  return JSON.parse(raw) as Marketplace;
}

async function ensureCleanOutput() {
  const skillsDir = path.join(targetRoot, 'skills');
  if (await exists(skillsDir)) {
    const entries = await readdir(skillsDir);
    for (const entry of entries) {
      await rm(path.join(skillsDir, entry), { recursive: true, force: true });
    }
  } else {
    await mkdir(skillsDir, { recursive: true });
  }
}

async function main() {
  if (!(await exists(upstreamRoot))) {
    throw new Error(`upstream repo not found at ${upstreamRoot}`);
  }

  const upstreamSha = await getUpstreamSha();
  const marketplace = await loadMarketplace();

  const plan: Array<{ name: string; category: string; sourceDir: string; sourceRef: string }> = [];
  for (const plugin of marketplace.plugins) {
    for (const skillPath of plugin.skills) {
      const cleaned = skillPath.replace(/^\.\//, '');
      const name = path.basename(cleaned);
      plan.push({
        name,
        category: plugin.name,
        sourceDir: path.join(upstreamRoot, cleaned),
        sourceRef: `jimliu/baoyu-skills@${upstreamSha}`,
      });
    }
  }

  plan.push({
    name: 'release-skills',
    category: 'release-workflow',
    sourceDir: path.join(upstreamRoot, '.claude', 'skills', 'release-skills'),
    sourceRef: `jimliu/baoyu-skills@${upstreamSha}`,
  });

  await ensureCleanOutput();

  const inventory: SkillInventoryItem[] = [];
  for (const item of plan) {
    const result = await migrateSkill(
      {
        name: item.name,
        description: '',
        sourceDir: item.sourceDir,
        category: item.category,
        sourceRef: item.sourceRef,
      },
      targetRoot,
    );

    inventory.push({
      name: result.name,
      category: result.category,
      source_dir: path.relative(targetRoot, result.sourceDir),
      source_ref: item.sourceRef,
      has_scripts: result.hasScripts,
      has_references: result.hasReferences,
      has_prompts: result.hasPrompts,
      external_dependencies: result.externalDependencies,
      env_vars: result.envVars,
      risk_level: result.riskLevel,
    });
  }

  const output = {
    generated_at: new Date().toISOString(),
    strategy: 'openclaw-native-first',
    upstream: {
      repo: 'https://github.com/JimLiu/baoyu-skills',
      commit: upstreamSha,
    },
    totals: {
      skills: inventory.length,
      with_scripts: inventory.filter((x) => x.has_scripts).length,
      with_references: inventory.filter((x) => x.has_references).length,
      with_prompts: inventory.filter((x) => x.has_prompts).length,
      high_risk: inventory.filter((x) => x.risk_level === 'high').length,
    },
    skills: inventory,
  };

  await writeFile(path.join(targetRoot, 'skill-inventory.json'), JSON.stringify(output, null, 2) + '\n', 'utf-8');

  const categoryIndex = inventory.reduce<Record<string, string[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item.name);
    return acc;
  }, {});

  await writeFile(
    path.join(targetRoot, 'skills', 'index.json'),
    JSON.stringify(
      {
        generated_at: new Date().toISOString(),
        categories: categoryIndex,
      },
      null,
      2,
    ) + '\n',
    'utf-8',
  );

  const diffReport = [
    '# Migration Diff Report',
    '',
    `- Upstream: jimliu/baoyu-skills@${upstreamSha}`,
    `- Migrated skills: ${inventory.length}`,
    `- Skills with scripts: ${output.totals.with_scripts}`,
    `- Skills with references: ${output.totals.with_references}`,
    `- High risk skills: ${output.totals.high_risk}`,
    '',
    '## High Risk Skills',
    '',
    ...inventory.filter((x) => x.risk_level === 'high').map((x) => `- ${x.name} (${x.category})`),
    '',
  ].join('\n');

  await writeFile(path.join(targetRoot, 'reports', 'migration-diff.md'), diffReport, 'utf-8');

  if (!inventoryOnly) {
    // no-op marker for explicit migration execution path
  }

  console.log(`Migrated ${inventory.length} skills from ${upstreamSha}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

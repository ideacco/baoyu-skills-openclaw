#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const cwd = process.cwd();

async function main() {
  const inventoryRaw = await readFile(path.join(cwd, 'skill-inventory.json'), 'utf-8');
  const inventory = JSON.parse(inventoryRaw) as {
    totals: { skills: number };
    skills: Array<{
      name: string;
      has_scripts: boolean;
      has_references: boolean;
      risk_level: string;
    }>;
  };

  if (inventory.totals.skills !== 16) {
    throw new Error(`expected 16 skills, got ${inventory.totals.skills}`);
  }

  const checks: string[] = [];
  for (const s of inventory.skills) {
    const skillMdPath = path.join(cwd, 'skills', s.name, 'SKILL.md');
    const md = await readFile(skillMdPath, 'utf-8');

    if (!md.startsWith('---\n')) throw new Error(`${s.name}: missing frontmatter`);
    if (!md.includes('identifier: openclaw/')) throw new Error(`${s.name}: missing openclaw identifier`);
    if (!md.includes('allowed-tools:')) throw new Error(`${s.name}: missing allowed-tools`);
    if (!md.includes('## OpenClaw Migration Notes')) throw new Error(`${s.name}: missing migration notes`);

    checks.push(`${s.name}:ok`);
  }

  const highRisk = inventory.skills.filter((s) => s.risk_level === 'high').map((s) => s.name);
  console.log(`validated_skills=${checks.length}`);
  console.log(`high_risk=${highRisk.join(',')}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});

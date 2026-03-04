# openclaw-baoyu-skills

English | [中文](./README.zh.md)

OpenClaw-native-first migration of `JimLiu/baoyu-skills`.

## Scope

* Upstream repo: `https://github.com/JimLiu/baoyu-skills`
* Upstream baseline commit: `a7ba3d73db878dcc35705f9a72228db68e4b52ef`
* Migrated skills: 16 (15 from `skills/*` + `release-skills`)

## Repository Layout

* `skills/<skill-name>/SKILL.md` - migrated skill metadata and instructions
* `skills/<skill-name>/scripts/` - preserved runtime scripts when present
* `skills/<skill-name>/references/` - preserved references when present
* `skills/<skill-name>/prompts/` - preserved prompts when present
* `tools/migrate-skill.ts` - single skill migrator
* `tools/migrate-all.ts` - batch migration pipeline
* `tools/validate-migration.ts` - migration validation checks
* `skill-inventory.json` - generated migration inventory
* `metadata-map.yaml` - source->target field mapping
* `reports/migration-diff.md` - generated diff summary

## Commands

```bash
# Run full migration
npm run migrate

# Regenerate inventory only
npm run inventory

# Validate migrated output
npm run validate
```

## Runtime Prerequisites

* Required: Node.js 20+ and Bun (`bun --version`).
* Recommended on macOS for image compression: `brew install webp` (provides `cwebp`).
* Optional fallback for image conversion: `brew install imagemagick`.
* Browser automation skills require local Chrome.

## One-Time Dependency Setup for Scripted Skills

Some skills contain local `package.json` files and should be installed once before first run:

```bash
cd skills/baoyu-format-markdown/scripts && bun install
cd ../../baoyu-post-to-x/scripts && bun install
cd ../../baoyu-markdown-to-html/scripts/md && bun install
cd ../../../baoyu-post-to-wechat/scripts/md && bun install
```

## API Keys (Only for AI Generation Skills)

No API key is required for utility-only skills such as `baoyu-compress-image` and `baoyu-format-markdown`.

AI generation skills (for example `baoyu-image-gen`) require at least one of:

* `OPENAI_API_KEY`
* `GOOGLE_API_KEY`
* `DASHSCOPE_API_KEY`
* `REPLICATE_API_TOKEN`

## Known Issues and Fixes

* `Could not load the "sharp" module using the darwin-arm64 runtime`
  Fix: install `cwebp` (`brew install webp`) so `baoyu-compress-image` avoids `sharp` fallback.
* `libpng error: IDAT: CRC error`
  Cause: input PNG is corrupted. Replace with a valid image and rerun.
* `Cannot find module 'unist-util-visit-parents/do-not-use-color'`
  Fix: run `bun install` under `skills/baoyu-format-markdown/scripts`.
* `npx autocorrect-node` network error
  Workaround: run formatter with `--no-spacing` in restricted/offline environments.
* Output path becomes `/.../~/...` (tilde not expanded)
  Cause: literal `~` path used in skill prompts/tool calls. Fix: always use `$HOME/...` or absolute paths.

## OpenClaw Compatibility Notes

* Metadata is rewritten into OpenClaw-oriented frontmatter fields (`identifier`, `source`, `argument-hint`, `allowed-tools`, `tags`).
* Original script entry points are preserved.
* Risk-aware `allowed-tools` is inferred (adds `browser` and/or `network` where needed).
* Original `.baoyu-skills/<skill>/EXTEND.md` semantics are retained; migration notes include compatibility guidance.

## Assumptions

* Migration is "OpenClaw native first", not strict Claude marketplace compatibility.
* If an upstream 17th skill is later specified, rerun migration after adding it to the plan list in `tools/migrate-all.ts`.

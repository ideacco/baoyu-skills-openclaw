# openclaw-baoyu-skills

English | [中文](./README.zh.md)

OpenClaw-native-first migration of `JimLiu/baoyu-skills`.

## Scope

* Upstream repo: `https://github.com/JimLiu/baoyu-skills`
* Upstream baseline commit: `a7ba3d73db878dcc35705f9a72228db68e4b52ef`
* Migrated skills: 16 (15 from `skills/*` + `release-skills`)

## Feature Overview

This skill pack focuses on content production workflows and includes 16 skills:

* Social content generation: `baoyu-xhs-images`, `baoyu-infographic`, `baoyu-cover-image`, `baoyu-slide-deck`, `baoyu-comic`, `baoyu-article-illustrator`
* AI generation backends: `baoyu-image-gen`, `baoyu-danger-gemini-web`
* Publishing automation: `baoyu-post-to-x`, `baoyu-post-to-wechat`
* Content utilities: `baoyu-url-to-markdown`, `baoyu-danger-x-to-markdown`, `baoyu-format-markdown`, `baoyu-markdown-to-html`, `baoyu-compress-image`
* Engineering/release workflow: `release-skills`

## Usage Guide

### 1. Install in OpenClaw (user-like flow)

Ask OpenClaw directly:

```text
Please install skills from github.com/ideacco/baoyu-skills-openclaw
```

Then verify:

```bash
openclaw skills list | grep -E 'baoyu-|release-skills'
openclaw skills check
```

### 2. Run with natural-language prompts

Example prompts in OpenClaw chat:

```text
帮我生成小红书图片，内容是 AI 工具推荐，用 notion 风格
把这篇 markdown 转成公众号可用的 HTML
帮我把这个网页保存成 markdown：https://example.com
压缩这张图片到 webp，质量 80
```

### 3. Run scripts directly (deterministic mode)

```bash
# Compress image
npx -y bun skills/baoyu-compress-image/scripts/main.ts ./tmp-test/in.png --format webp --quality 80 --json

# Format markdown
cd skills/baoyu-format-markdown/scripts && bun main.ts ../../../README.md --no-spacing
```

### 4. Resolve same-name skill conflicts

If OpenClaw already has another `baoyu-*` skill from `openclaw-workspace`, it may load that version first. Check active source:

```bash
openclaw skills info baoyu-xhs-images --json
```

If needed, remove/disable the old workspace copy so this repository version is used.

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

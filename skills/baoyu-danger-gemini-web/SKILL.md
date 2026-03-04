---
name: baoyu-danger-gemini-web
description: Generates images and text via reverse-engineered Gemini Web API. Supports text generation, image generation from prompts, reference images for vision input, and multi-turn conversations. Use when other skills need image generation backend, or when user requests "generate image with Gemini", "Gemini text generation", or needs vision-capable AI generation.
identifier: openclaw/baoyu-danger-gemini-web
source: migrated-from-jimliu/baoyu-skills@a7ba3d73db878dcc35705f9a72228db68e4b52ef
argument-hint: Accepts file paths, URLs, and CLI flags compatible with original baoyu skill workflows.
allowed-tools:
  - read
  - write
  - bash
  - browser
  - network
tags:
  - migrated
  - baoyu
  - openclaw
---

# Gemini Web Client

Text/image generation via Gemini Web API. Supports reference images and multi-turn conversations.

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.ts`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/main.ts` | CLI entry point for text/image generation |
| `scripts/gemini-webapi/*` | TypeScript port of `gemini_webapi` (GeminiClient, types, utils) |

## Consent Check (REQUIRED)

Before first use, verify user consent for reverse-engineered API usage.

**Consent file locations**:
- macOS: `~/Library/Application Support/baoyu-skills/gemini-web/consent.json`
- Linux: `~/.local/share/baoyu-skills/gemini-web/consent.json`
- Windows: `%APPDATA%\baoyu-skills\gemini-web\consent.json`

**Flow**:
1. Check if consent file exists with `accepted: true` and `disclaimerVersion: "1.0"`
2. If valid consent exists → print warning with `acceptedAt` date, proceed
3. If no consent → show disclaimer, ask user via `AskUserQuestion`:
   - "Yes, I accept" → create consent file with ISO timestamp, proceed
   - "No, I decline" → output decline message, stop
4. Consent file format: `{"version":1,"accepted":true,"acceptedAt":"<ISO>","disclaimerVersion":"1.0"}`

---

## Preferences (EXTEND.md)

Use Bash to check EXTEND.md existence (priority order):

```bash
# Check project-level first
test -f .baoyu-skills/baoyu-danger-gemini-web/EXTEND.md && echo "project"

# Then user-level (cross-platform: $HOME works on macOS/Linux/WSL)
test -f "$HOME/.baoyu-skills/baoyu-danger-gemini-web/EXTEND.md" && echo "user"
```

┌──────────────────────────────────────────────────────────┬───────────────────┐
│                           Path                           │     Location      │
├──────────────────────────────────────────────────────────┼───────────────────┤
│ .baoyu-skills/baoyu-danger-gemini-web/EXTEND.md          │ Project directory │
├──────────────────────────────────────────────────────────┼───────────────────┤
│ $HOME/.baoyu-skills/baoyu-danger-gemini-web/EXTEND.md    │ User home         │
└──────────────────────────────────────────────────────────┴───────────────────┘

┌───────────┬───────────────────────────────────────────────────────────────────────────┐
│  Result   │                                  Action                                   │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Found     │ Read, parse, apply settings                                               │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Not found │ Use defaults                                                              │
└───────────┴───────────────────────────────────────────────────────────────────────────┘

**EXTEND.md Supports**: Default model | Proxy settings | Custom data directory

## Usage

```bash
# Text generation
npx -y bun ${SKILL_DIR}/scripts/main.ts "Your prompt"
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "Your prompt" --model gemini-3-flash

# Image generation
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "A cute cat" --image cat.png
npx -y bun ${SKILL_DIR}/scripts/main.ts --promptfiles system.md content.md --image out.png

# Vision input (reference images)
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "Describe this" --reference image.png
npx -y bun ${SKILL_DIR}/scripts/main.ts --prompt "Create variation" --reference a.png --image out.png

# Multi-turn conversation
npx -y bun ${SKILL_DIR}/scripts/main.ts "Remember: 42" --sessionId session-abc
npx -y bun ${SKILL_DIR}/scripts/main.ts "What number?" --sessionId session-abc

# JSON output
npx -y bun ${SKILL_DIR}/scripts/main.ts "Hello" --json
```

## Options

| Option | Description |
|--------|-------------|
| `--prompt`, `-p` | Prompt text |
| `--promptfiles` | Read prompt from files (concatenated) |
| `--model`, `-m` | Model: gemini-3-pro (default), gemini-3-flash, gemini-3-flash-thinking, gemini-3.1-pro-preview |
| `--image [path]` | Generate image (default: generated.png) |
| `--reference`, `--ref` | Reference images for vision input |
| `--sessionId` | Session ID for multi-turn conversation |
| `--list-sessions` | List saved sessions |
| `--json` | Output as JSON |
| `--login` | Refresh cookies, then exit |
| `--cookie-path` | Custom cookie file path |
| `--profile-dir` | Chrome profile directory |

## Models

| Model | Description |
|-------|-------------|
| `gemini-3-pro` | Default, latest 3.0 Pro |
| `gemini-3-flash` | Fast, lightweight 3.0 Flash |
| `gemini-3-flash-thinking` | 3.0 Flash with thinking |
| `gemini-3.1-pro-preview` | 3.1 Pro preview (empty header, auto-routed) |

## Authentication

First run opens browser for Google auth. Cookies cached automatically.

Supported browsers (auto-detected): Chrome, Chrome Canary/Beta, Chromium, Edge.

Force refresh: `--login` flag. Override browser: `GEMINI_WEB_CHROME_PATH` env var.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_WEB_DATA_DIR` | Data directory |
| `GEMINI_WEB_COOKIE_PATH` | Cookie file path |
| `GEMINI_WEB_CHROME_PROFILE_DIR` | Chrome profile directory |
| `GEMINI_WEB_CHROME_PATH` | Chrome executable path |
| `HTTP_PROXY`, `HTTPS_PROXY` | Proxy for Google access (set inline with command) |

## Sessions

Session files stored in data directory under `sessions/<id>.json`.

Contains: `id`, `metadata` (Gemini chat state), `messages` array, timestamps.

## Extension Support

Custom configurations via EXTEND.md. See **Preferences** section for paths and supported options.
## OpenClaw Migration Notes

- Migration mode: OpenClaw native first
- Preserved directories:
  - scripts: yes
  - references: no
  - prompts: no
- External dependencies: bun, chrome, external-ai-api
- Risk level: high
- Environment variables (detected): `API`, `GEMINI_WEB_CHROME_PATH`, `GEMINI_WEB_CHROME_PROFILE_DIR`, `HOME`
- Config compatibility: keep original `.baoyu-skills/<skill>/EXTEND.md` behavior and add OpenClaw-compatible path in runtime wrappers when needed.
## OpenClaw Preflight Checks

- Confirm `bun` is available when script examples use `npx -y bun ...`.
- Confirm Chrome is installed and launchable for CDP/browser automation flows.
- Confirm required API credentials are exported before execution.

Detected env vars: `API`, `GEMINI_WEB_CHROME_PATH`, `GEMINI_WEB_CHROME_PROFILE_DIR`, `HOME`

## OpenClaw Failure Fallback

- If runtime dependency is missing, stop execution and return exact install/setup command.
- If API call fails, suggest retry with explicit provider/model flags and validate key scope.
- If browser automation fails, switch to manual/wait mode where available.
- For high-risk workflows, require explicit user confirmation before irreversible actions.


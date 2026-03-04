---
name: baoyu-url-to-markdown
description: Fetch any URL and convert to markdown using Chrome CDP. Supports two modes - auto-capture on page load, or wait for user signal (for pages requiring login). Use when user wants to save a webpage as markdown.
identifier: openclaw/baoyu-url-to-markdown
source: migrated-from-jimliu/baoyu-skills@a7ba3d73db878dcc35705f9a72228db68e4b52ef
argument-hint: Accepts file paths, URLs, and CLI flags compatible with original baoyu skill workflows.
allowed-tools:
  - read
  - write
  - bash
  - browser
tags:
  - migrated
  - baoyu
  - openclaw
---

# URL to Markdown

Fetches any URL via Chrome CDP and converts HTML to clean markdown.

## Script Directory

**Important**: All scripts are located in the `scripts/` subdirectory of this skill.

**Agent Execution Instructions**:
1. Determine this SKILL.md file's directory path as `SKILL_DIR`
2. Script path = `${SKILL_DIR}/scripts/<script-name>.ts`
3. Replace all `${SKILL_DIR}` in this document with the actual path

**Script Reference**:
| Script | Purpose |
|--------|---------|
| `scripts/main.ts` | CLI entry point for URL fetching |

## Preferences (EXTEND.md)

Use Bash to check EXTEND.md existence (priority order):

```bash
# Check project-level first
test -f .baoyu-skills/baoyu-url-to-markdown/EXTEND.md && echo "project"

# Then user-level (cross-platform: $HOME works on macOS/Linux/WSL)
test -f "$HOME/.baoyu-skills/baoyu-url-to-markdown/EXTEND.md" && echo "user"
```

┌────────────────────────────────────────────────────────┬───────────────────┐
│                          Path                          │     Location      │
├────────────────────────────────────────────────────────┼───────────────────┤
│ .baoyu-skills/baoyu-url-to-markdown/EXTEND.md          │ Project directory │
├────────────────────────────────────────────────────────┼───────────────────┤
│ $HOME/.baoyu-skills/baoyu-url-to-markdown/EXTEND.md    │ User home         │
└────────────────────────────────────────────────────────┴───────────────────┘

┌───────────┬───────────────────────────────────────────────────────────────────────────┐
│  Result   │                                  Action                                   │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Found     │ Read, parse, apply settings                                               │
├───────────┼───────────────────────────────────────────────────────────────────────────┤
│ Not found │ Use defaults                                                              │
└───────────┴───────────────────────────────────────────────────────────────────────────┘

**EXTEND.md Supports**: Default output directory | Default capture mode | Timeout settings

## Features

- Chrome CDP for full JavaScript rendering
- Two capture modes: auto or wait-for-user
- Clean markdown output with metadata
- Handles login-required pages via wait mode

## Usage

```bash
# Auto mode (default) - capture when page loads
npx -y bun ${SKILL_DIR}/scripts/main.ts <url>

# Wait mode - wait for user signal before capture
npx -y bun ${SKILL_DIR}/scripts/main.ts <url> --wait

# Save to specific file
npx -y bun ${SKILL_DIR}/scripts/main.ts <url> -o output.md
```

## Options

| Option | Description |
|--------|-------------|
| `<url>` | URL to fetch |
| `-o <path>` | Output file path (default: auto-generated) |
| `--wait` | Wait for user signal before capturing |
| `--timeout <ms>` | Page load timeout (default: 30000) |

## Capture Modes

| Mode | Behavior | Use When |
|------|----------|----------|
| Auto (default) | Capture on network idle | Public pages, static content |
| Wait (`--wait`) | User signals when ready | Login-required, lazy loading, paywalls |

**Wait mode workflow**:
1. Run with `--wait` → script outputs "Press Enter when ready"
2. Ask user to confirm page is ready
3. Send newline to stdin to trigger capture

## Output Format

YAML front matter with `url`, `title`, `description`, `author`, `published`, `captured_at` fields, followed by converted markdown content.

## Output Directory

```
url-to-markdown/<domain>/<slug>.md
```

- `<slug>`: From page title or URL path (kebab-case, 2-6 words)
- Conflict resolution: Append timestamp `<slug>-YYYYMMDD-HHMMSS.md`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `URL_CHROME_PATH` | Custom Chrome executable path |
| `URL_DATA_DIR` | Custom data directory |
| `URL_CHROME_PROFILE_DIR` | Custom Chrome profile directory |

**Troubleshooting**: Chrome not found → set `URL_CHROME_PATH`. Timeout → increase `--timeout`. Complex pages → try `--wait` mode.

## Extension Support

Custom configurations via EXTEND.md. See **Preferences** section for paths and supported options.
## OpenClaw Migration Notes

- Migration mode: OpenClaw native first
- Preserved directories:
  - scripts: yes
  - references: no
  - prompts: no
- External dependencies: bun, chrome
- Risk level: medium
- Environment variables (detected): `HOME`, `URL_CHROME_PATH`, `URL_CHROME_PROFILE_DIR`, `URL_DATA_DIR`
- Config compatibility: keep original `.baoyu-skills/<skill>/EXTEND.md` behavior and add OpenClaw-compatible path in runtime wrappers when needed.
## OpenClaw Preflight Checks

- Confirm `bun` is available when script examples use `npx -y bun ...`.
- Confirm Chrome is installed and launchable for CDP/browser automation flows.

Detected env vars: `HOME`, `URL_CHROME_PATH`, `URL_CHROME_PROFILE_DIR`, `URL_DATA_DIR`

## OpenClaw Failure Fallback

- If runtime dependency is missing, stop execution and return exact install/setup command.
- If browser automation fails, switch to manual/wait mode where available.


# openclaw-baoyu-skills

[English](./README.md) | 中文

基于 `JimLiu/baoyu-skills` 的 OpenClaw 原生优先迁移版本。

## 范围

* 上游仓库：`https://github.com/JimLiu/baoyu-skills`
* 上游基线提交：`a7ba3d73db878dcc35705f9a72228db68e4b52ef`
* 已迁移技能：16 个（`skills/*` 下 15 个 + `release-skills`）

## 功能介绍

这个技能包主要面向内容生产场景，共包含 16 个技能：

* 社交内容生成：`baoyu-xhs-images`、`baoyu-infographic`、`baoyu-cover-image`、`baoyu-slide-deck`、`baoyu-comic`、`baoyu-article-illustrator`
* AI 生成后端：`baoyu-image-gen`、`baoyu-danger-gemini-web`
* 平台发布自动化：`baoyu-post-to-x`、`baoyu-post-to-wechat`
* 内容处理工具：`baoyu-url-to-markdown`、`baoyu-danger-x-to-markdown`、`baoyu-format-markdown`、`baoyu-markdown-to-html`、`baoyu-compress-image`
* 工程/发布流程：`release-skills`

## 使用方法

### 1. 在 OpenClaw 中安装（贴近真实用户流程）

直接在 OpenClaw 对话中输入：

```text
Please install skills from github.com/ideacco/baoyu-skills-openclaw
```

安装后验证：

```bash
openclaw skills list | grep -E 'baoyu-|release-skills'
openclaw skills check
```

### 2. 通过自然语言直接调用

可直接在 OpenClaw 聊天中使用：

```text
帮我生成小红书图片，内容是 AI 工具推荐，用 notion 风格
把这篇 markdown 转成公众号可用的 HTML
帮我把这个网页保存成 markdown：https://example.com
压缩这张图片到 webp，质量 80
```

### 3. 直接运行脚本（可复现、可调试）

```bash
# 图片压缩
npx -y bun skills/baoyu-compress-image/scripts/main.ts ./tmp-test/in.png --format webp --quality 80 --json

# Markdown 格式化
cd skills/baoyu-format-markdown/scripts && bun main.ts ../../../README.md --no-spacing
```

### 4. 处理同名技能冲突

如果 OpenClaw 里已存在来自 `openclaw-workspace` 的同名 `baoyu-*` 技能，可能会优先命中旧版本。可先检查当前命中的来源：

```bash
openclaw skills info baoyu-xhs-images --json
```

必要时移除或禁用旧的 workspace 版本，确保使用本仓库版本。

## 仓库结构

* `skills/<skill-name>/SKILL.md` - 迁移后的技能元数据与说明
* `skills/<skill-name>/scripts/` - 保留原有可执行脚本（如存在）
* `skills/<skill-name>/references/` - 保留原有参考资料（如存在）
* `skills/<skill-name>/prompts/` - 保留原有提示模板（如存在）
* `tools/migrate-skill.ts` - 单个技能迁移脚本
* `tools/migrate-all.ts` - 批量迁移流水线
* `tools/validate-migration.ts` - 迁移结果校验脚本
* `skill-inventory.json` - 生成的技能清单
* `metadata-map.yaml` - 源字段到目标字段映射
* `reports/migration-diff.md` - 迁移差异汇总

## 常用命令

```bash
# 执行全量迁移
npm run migrate

# 仅重新生成清单
npm run inventory

# 校验迁移结果
npm run validate
```

## 运行前依赖

* 必需：Node.js 20+ 和 Bun（`bun --version`）
* macOS 图片压缩推荐安装：`brew install webp`（提供 `cwebp`）
* 可选图片转换兜底：`brew install imagemagick`
* 涉及浏览器自动化的技能需要本地安装 Chrome

## 首次运行前的一次性依赖安装

部分技能目录下有独立 `package.json`，首次使用前建议先安装依赖：

```bash
cd skills/baoyu-format-markdown/scripts && bun install
cd ../../baoyu-post-to-x/scripts && bun install
cd ../../baoyu-markdown-to-html/scripts/md && bun install
cd ../../../baoyu-post-to-wechat/scripts/md && bun install
```

## API Key（仅 AI 生成类技能需要）

像 `baoyu-compress-image`、`baoyu-format-markdown` 这类工具型技能不需要 API Key。

AI 生成类技能（例如 `baoyu-image-gen`）至少需要配置以下之一：

* `OPENAI_API_KEY`
* `GOOGLE_API_KEY`
* `DASHSCOPE_API_KEY`
* `REPLICATE_API_TOKEN`

## 常见问题与修复

* `Could not load the "sharp" module using the darwin-arm64 runtime`
  修复：安装 `cwebp`（`brew install webp`），让 `baoyu-compress-image` 优先走 `cwebp` 而不是 `sharp` 回退。
* `libpng error: IDAT: CRC error`
  原因：输入 PNG 文件损坏。更换有效图片后重试。
* `Cannot find module 'unist-util-visit-parents/do-not-use-color'`
  修复：进入 `skills/baoyu-format-markdown/scripts` 执行 `bun install`。
* `npx autocorrect-node` 网络错误
  规避：在受限/离线环境下运行格式化时加 `--no-spacing`。
* 输出路径变成 `/.../~/...`（`~` 未展开）
  原因：skill 指令中使用了字面量 `~` 路径。修复：统一使用 `$HOME/...` 或绝对路径。

## OpenClaw 兼容说明

* 元数据已重写为 OpenClaw 导向 frontmatter 字段（`identifier`、`source`、`argument-hint`、`allowed-tools`、`tags`）。
* 原有脚本入口保持不变。
* 已按风险等级自动推断 `allowed-tools`（必要时附加 `browser` 和/或 `network`）。
* 保留原 `.baoyu-skills/<skill>/EXTEND.md` 语义，并在迁移说明中补充兼容指引。

## 迁移假设

* 策略为“OpenClaw 原生优先”，不追求与 Claude marketplace 完全同构。
* 若后续补充上游第 17 个 skill，可在 `tools/migrate-all.ts` 中加入后重新执行迁移。

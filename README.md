# ResearchKit

> 终端里的**聚合调研路由器**：把本机已装的搜索 / 分析 CLI 编排成一次调研，产出**一份带工具归属的 Markdown 报告**。
> An agent skill that orchestrates local research CLIs (Bilibili, NotebookLM, Exa, GitHub, arXiv, community sites…) into one traceable Markdown report.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)](#前置依赖)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

---

## 目录

- [它是什么](#它是什么)
- [工作原理](#工作原理)
- [快速开始](#快速开始)
- [前置依赖](#前置依赖)
  - [必需](#1-必需)
  - [推荐后端](#2-推荐后端)
  - [可选后端](#3-可选后端)
- [配置](#配置)
  - [安装 skill](#1-安装-skill)
  - [输出目录](#2-输出目录)
  - [OpenCLI 浏览器扩展](#3-opencli-浏览器扩展)
  - [B 站 bili](#4-b-站-bili无需登录)
  - [NotebookLM](#5-notebooklm需要-google-账号)
  - [Exa 网页搜索](#6-exa-网页搜索mcporter)
  - [GitHub CLI](#7-github-cligh)
  - [外部 CLI Agent](#8-可选外部-cli-agent)
  - [环境变量速查](#9-环境变量速查)
- [验证安装](#验证安装)
- [使用](#使用)
- [目录结构](#目录结构)
- [常见问题](#常见问题)
- [安全与边界](#安全与边界)
- [License](#license)

---

## 它是什么

ResearchKit 本身**不是搜索引擎**，而是「路由器 + 报告生成器」：

- 它教 agent（Pi / Claude Code / Codex / Cursor 等）**先探活**，再按意图挑选 2–4 个互补后端；
- 每个后端只做只读检索（搜索、浏览、阅读、提取）；
- 结果统一落盘成 `YYYYMMDD_核心主题.md`，结构固定为「H1 = 工具名，H2/H3 = 调研结果」，每条结论都带来源链接。

**适合**：全网调研、竞品/技术选型对比、论文与仓库检索、中文社区口碑、视频字幕提炼、需要可追溯引用的长报告。

**不适合**：纯写作 / 翻译、发帖评论点赞等写操作、已有专门 skill 的平台任务（论文 PDF 用 `paper-fetch`、B 站取帧用 `bangumi-frames`）。

## 工作原理

```
用户提问（“调研一下 X”）
        │
        ▼
[Step 0] scripts/probe.mjs --deep       # 探活：哪些后端此刻真的可用
        │
        ▼
[Step 1] SKILL.md 路由表                # 按意图选 2–4 个互补后端
        │
        ▼
[Step 2] 并行执行只读命令 → $TEMP/researchkit/<slug>/
        │
        ▼
[Step 3] scripts/new-report.mjs         # 生成骨架并填充
        │
        ▼
[Step 4] # 汇总（一致结论 / 分歧 / 缺口）
        │
        ▼
终端只输出 ≤200 字摘要 + 报告绝对路径
```

## 快速开始

```bash
# 0) 克隆
git clone https://github.com/yuhang234/ResearchKit.git
cd ResearchKit

# 1) 安装到 agent 技能目录（Windows）
pwsh -File ./scripts/install.ps1
# macOS / Linux
bash ./scripts/install.sh

# 2) 探活，看现在能用哪些后端
node scripts/probe.mjs --table

# 3) 在 agent 里说：“调研一下 2026 年 AI Agent 记忆方案”
#    或强制指定：/skill:researchkit 调研 …
```

> 第一次跑建议先看 [前置依赖](#前置依赖)。**只有 Node 是硬性要求**，其余后端按需安装，缺了会自动降级到可用后端。

---

## 前置依赖

### 1. 必需

| 依赖 | 版本 | 用途 | 安装 |
| --- | --- | --- | --- |
| **Node.js** | ≥ 18 | 运行 `probe.mjs` / `new-report.mjs` | [nodejs.org](https://nodejs.org) 或 `winget install OpenJS.NodeJS.LTS` / `brew install node` |
| **Git** | 任意 | 克隆仓库 | [git-scm.com](https://git-scm.com) |
| **curl** | 任意 | Jina Reader、公开 API 兜底（Windows 10+ / macOS / Linux 自带） | 系统自带 |

### 2. 推荐后端

这些后端**无需登录、无需浏览器**，装完即可覆盖 80% 的调研场景。

| 后端 | 能做什么 | 安装 | 验证 |
| --- | --- | --- | --- |
| **OpenCLI** | 169 个站点适配器：Google / 知乎 / 小红书 / X / Reddit / V2EX / 微博 / arXiv / PubMed / Wikipedia / HN / YouTube … | `npm i -g @jackwener/opencli` | `opencli doctor` |
| **bili**（B 站） | 视频搜索、详情、**字幕**、评论、热门、排行、UP 主 | `uv tool install bilibili-cli`（或 `pipx install bilibili-cli`） | `bili --version` |
| **mcporter + exa** | 语义网页搜索 + 正文抓取（英文/技术话题最强） | `npm i -g mcporter` | `mcporter list` |

> OpenCLI 分两类适配器：
> - **纯 HTTP（无需浏览器桥）**：`arxiv`、`pubmed`、`wikipedia`、`hackernews`、`npm`、`pypi`
> - **需要 Chrome 扩展（浏览器桥）**：`google`、`google-scholar`、`zhihu`、`xiaohongshu`、`twitter`、`reddit`、`weibo`、`bilibili`、`notebooklm`、`web read`、`youtube`
>
> 没装扩展也能用，只是浏览器类命令会返回 `BROWSER_CONNECT (69)`，skill 会自动降级。

### 3. 可选后端

| 后端 | 能做什么 | 安装 | 需要登录 |
| --- | --- | --- | --- |
| **notebooklm-py** | NotebookLM 深调研：多来源装进一个本子，回答带 `[1][2]` 引用 | `uv tool install "notebooklm-py[browser]"` | ✅ Google 账号 |
| **GitHub CLI** | 仓库 / 代码 / Issue / PR 搜索 | `winget install --id GitHub.cli` / `brew install gh` / [官方文档](https://cli.github.com) | ✅ `gh auth login` |
| **agent-reach** | 15 平台路由 + 平台体检 + 音视频转录 | `uv tool install agent-reach` 然后 `agent-reach install` | 部分平台 |
| **yt-dlp** | YouTube / 通用视频字幕与音频 | `uv tool install yt-dlp` 或 `pip install yt-dlp` | ❌ |
| **claude / codex** | 外部模型综合、交叉验证、找矛盾 | `npm i -g @anthropic-ai/claude-code` / `npm i -g @openai/codex` | 各自登录 |
| **oracle** | 第二模型复核（GPT 系 + 联网） | `npm i -g @steipete/oracle` | ChatGPT |
| **grok** | 自带 web search，适合 X / 最新动态 | 见其官方文档（可选） | ✅ |

**Python 类后端**（bili / notebooklm / agent-reach / yt-dlp）推荐用 [uv](https://docs.astral.sh/uv/) 管理：

```powershell
# Windows
winget install --id=astral-sh.uv -e
# macOS
brew install uv
# Linux
curl -LsSf https://astral.sh/uv/install.sh | sh
```

> 用 pipx 也行：`pipx install bilibili-cli`。**不建议**直接 `pip install` 进全局环境。

---

## 配置

### 1. 安装 skill

skill 必须出现在 agent 的**技能目录**里。安装脚本默认使用**符号链接 / Junction**（不复制文件），所以 `git pull` 之后立刻生效。

**Windows（PowerShell，无需管理员）**

```powershell
pwsh -File ./scripts/install.ps1
# 自定义技能目录 / 自定义报告输出目录
pwsh -File ./scripts/install.ps1 -Dest "$HOME\.claude\skills\researchkit" -OutDir "D:\Notes\research"
```

**macOS / Linux**

```bash
bash ./scripts/install.sh
# 自定义技能目录 / 输出目录
bash ./scripts/install.sh --dest ~/.claude/skills/researchkit --out-dir ~/Notes/research
```

**手动安装**（任何系统）

```powershell
# Windows
New-Item -ItemType Junction -Path "$HOME\.agents\skills\researchkit" -Target "C:\path\to\ResearchKit"
```
```bash
# macOS / Linux
ln -sfn /path/to/ResearchKit ~/.agents/skills/researchkit
```

常见技能目录：

| Agent | 技能目录 |
| --- | --- |
| Pi | `~/.agents/skills/researchkit`（脚本默认） |
| Claude Code | `~/.claude/skills/researchkit` |
| Codex | `~/.codex/skills/researchkit` |
| 其他 | 该 agent 文档里约定的 skills 目录 |

### 2. 输出目录

报告默认写到 `~/researchkit-reports/`。三种覆盖方式，优先级从高到低：

1. 命令参数：`node scripts/new-report.mjs --out "D:/Notes/research" ...`
2. 环境变量：`RESEARCHKIT_OUT_DIR`
3. 配置文件 `config.json`（放在仓库根目录，已 gitignore）：

```json
{ "outDir": "D:/Notes/research" }
```

```powershell
# 永久生效（Windows）
setx RESEARCHKIT_OUT_DIR "D:\Notes\research"
```
```bash
# macOS / Linux（写进 ~/.bashrc 或 ~/.zshrc）
export RESEARCHKIT_OUT_DIR="$HOME/Notes/research"
```

`config.example.json` 是模板，复制成 `config.json` 再改即可。

### 3. OpenCLI 浏览器扩展

只有用到 `google` / `zhihu` / `xiaohongshu` / `twitter` / `reddit` / `weibo` / `youtube` / `web read` 时才需要。

1. 从 [opencli releases](https://github.com/jackwener/opencli/releases) 下载扩展包；
2. Chrome / Chromium 打开 `chrome://extensions` → 开启「开发者模式」；
3. 「加载已解压的扩展程序」→ 选择扩展目录；
4. 验证：

```bash
opencli doctor
# 期望看到：
# [OK] Daemon: running on port 19825
# [OK] Extension: connected
```

> 扩展连不上时**不要反复重试**。skill 会降级到 exa / Jina / bili / notebooklm / gh / arXiv 等无桥后端。

### 4. B 站 bili（无需登录）

```bash
uv tool install bilibili-cli
bili --version          # bili, version 0.6.2
bili search "AI Agent" --type video -n 5 --json
```

> **Windows 必看**：Python CLI 在默认 GBK 代码页下会 `UnicodeEncodeError`。
> 所有 `bili` / `notebooklm` 命令前都要 `export PYTHONIOENCODING=utf-8`（PowerShell：`$env:PYTHONIOENCODING="utf-8"`）。

### 5. NotebookLM（需要 Google 账号）

```bash
# 1) 安装（注意 [browser] extra，否则可能装成空壳）
uv tool install --force "notebooklm-py[browser]"

# 2) 登录（会打开浏览器，账号密码由你自己输入，skill 绝不代登录）
notebooklm login

# 3) 校验（要求 status=ok 且 token_fetch=true）
notebooklm auth check --test --json

# 4) 列出已有笔记本
notebooklm list --json
```

常见状态：

| 现象 | 含义 | 处理 |
| --- | --- | --- |
| `AUTH_ERROR` | 本地 cookie 过期 | 重新 `notebooklm login` |
| `Scripts/` 里没有 `notebooklm.exe` | uv tool 装成空壳 | `uv tool install --force "notebooklm-py[browser]"` |
| `token_fetch: false` | 只做了本地校验 | 重新登录后再 `auth check --test` |

> NotebookLM 的 `create` / `source add` / `generate` 属于**写操作**，skill 只在你明确要求“用 NotebookLM 做深调研”时才执行；`delete` / `share` / `language set` 永不自动执行。

### 6. Exa 网页搜索（mcporter）

```bash
npm i -g mcporter

# 注册 exa MCP（公共端点，无需 key）
mcporter config add exa https://mcp.exa.ai/mcp

# 验证：应显示 exa (2 tools)
mcporter list

# 试一次
mcporter call 'exa.web_search_exa(query: "AI agent memory architecture", numResults: 3)'
```

配置文件位置：`~/.mcporter/mcporter.json`

```json
{
  "mcpServers": {
    "exa": { "baseUrl": "https://mcp.exa.ai/mcp" }
  }
}
```

> - 公共端点有速率限制；量大时可在 [exa.ai](https://exa.ai) 申请 key，用 `mcporter auth exa` 或环境变量 `EXA_API_KEY` 配置。
> - 首次调用有 8–15s 冷启动，命令超时建议 ≥ 60s。

### 7. GitHub CLI（gh）

```bash
# 安装
winget install --id GitHub.cli   # Windows
brew install gh                  # macOS
sudo apt install gh              # Debian/Ubuntu

# 登录（scope 至少包含 repo）
gh auth login

# 验证
gh auth status
gh search repos "notebooklm" --sort stars --limit 3
```

### 8. （可选）外部 CLI Agent

用于“第二模型复核 / 长材料综合”。这些不是搜索引擎，skill 会把已抓到的材料喂给它们，并要求**只读沙箱**：

```bash
claude -p "…" --permission-mode plan                 # 只读规划模式
codex exec --skip-git-repo-check -s read-only "…"    # 只读沙箱
oracle -p "…" -f material.md                         # 第二模型复核
```

> `gemini` 在本项目实测已失效（`IneligibleTierError`），skill 明确**不调用**它。

### 9. 环境变量速查

| 变量 | 作用 | 示例 |
| --- | --- | --- |
| `RESEARCHKIT_OUT_DIR` | 报告输出目录 | `D:\Notes\research` |
| `PYTHONIOENCODING` | 修复 Windows 下 Python CLI 的 GBK 崩溃 | `utf-8` |
| `SEMANTIC_SCHOLAR_API_KEY` | 避免 Semantic Scholar 429 | 可选 |
| `EXA_API_KEY` | 提高 exa 配额 | 可选 |
| `NOTEBOOKLM_PROFILE` | 多任务隔离 NotebookLM 登录态 | `agent-1` |
| `TEMP` / `TMPDIR` | 原始输出缓存位置 | 默认即可 |

---

## 验证安装

```bash
node scripts/probe.mjs --table    # 人读
node scripts/probe.mjs --deep     # 追加：opencli 桥 / notebooklm 认证 / exa 健康
node scripts/probe.mjs            # 机器可读 JSON
```

输出字段怎么读：

| 字段 | 含义 | 为 `false` 时 |
| --- | --- | --- |
| `tools.<id>.available` | 命令在 `PATH` 中 | 装它，或忽略（skill 会降级） |
| `checks.opencli_bridge.ok` | Chrome 扩展已连接 | 用 exa / Jina / bili / gh / arXiv |
| `checks.notebooklm_auth.ok` | 服务端 token 校验通过 | `notebooklm login` |
| `checks.exa.ok` | mcporter 的 exa server 健康 | 用 Jina / opencli google |
| `recommended` | 本次建议用的后端 | 直接照用 |

探活全部 `NO` 也能用——只要有 `curl`，Jina Reader + Wikipedia API + HN API 就是最小可用组合。

---

## 使用

在 agent 里直接说：

```
调研一下 2026 年 AI Agent 记忆方案有哪些主流做法，各自代价是什么
帮我对比 Mem0 / Zep / Letta 的生产案例
看看 B 站和知乎怎么评价 NotebookLM
```

或者手动跑：

```bash
# 1) 探活
node scripts/probe.mjs --deep

# 2) 生成报告骨架（会打印绝对路径）
node scripts/new-report.mjs \
  --topic "Agent 记忆方案对比" \
  --tools exa,bilibili,arxiv \
  --query "2026 年 AI Agent 记忆方案有哪些主流做法？"

# 3) 按 SKILL.md 的路由表执行命令，把结果填进骨架
# 4) 把 frontmatter 的 status 改成 complete
```

报告结构（硬性契约，见 `references/90-report-format.md`）：

```markdown
---
title: "Agent 记忆方案对比"
query: "…"
created: 2026-10-20T20:10:00+08:00
tools: [exa, bilibili, arxiv]
status: complete
---

# exa
## 查询与参数
## 结果
### 要点
### 证据
# bilibili
…
# 汇总
## 一致结论
## 分歧与不确定性
## 缺口与后续
## 参考来源
```

> 失败或未使用的后端**不留空 H1**，写进「汇总 → 缺口与后续」。

## 目录结构

```
ResearchKit/
├── SKILL.md                     # 给 agent 的主指令（路由表 / 工作流 / 铁律）
├── README.md                    # 本文档
├── LICENSE
├── config.example.json          # 输出目录配置模板
├── references/
│   ├── 00-environment.md        # 后端清单、编码坑、探活字段
│   ├── 10-web-search.md         # exa / Google / Jina / Wikipedia / HN
│   ├── 20-bilibili-video.md     # B站 / YouTube / 转录
│   ├── 30-notebooklm.md         # NotebookLM 深调研全流程
│   ├── 40-community.md          # 知乎 / 小红书 / X / Reddit / V2EX / 微博
│   ├── 50-cli-agents.md         # claude / codex / oracle 只读调研
│   ├── 60-academic-code.md      # arXiv / PubMed / Scholar / GitHub
│   ├── 90-report-format.md      # 报告模板与验收清单
│   └── 95-troubleshooting.md    # 报错对照表
└── scripts/
    ├── install.ps1              # Windows 安装（Junction）
    ├── install.sh               # macOS / Linux 安装（symlink）
    ├── probe.mjs                # 后端探活
    └── new-report.mjs           # 报告骨架
```

## 常见问题

<details>
<summary><b>opencli 报 <code>BROWSER_CONNECT (69)</code></b></summary>

Chrome 没运行，或没加载 OpenCLI 扩展。跑 `opencli doctor` 确认，然后按 [OpenCLI 浏览器扩展](#3-opencli-浏览器扩展) 装一次。
**不要重试**，直接用 exa / Jina / bili / notebooklm / gh / arXiv 等无桥后端。
</details>

<details>
<summary><b><code>UnicodeEncodeError: 'gbk' codec can't encode character</code></b></summary>

Windows 默认代码页问题。命令前加：

```bash
export PYTHONIOENCODING=utf-8        # Git Bash
$env:PYTHONIOENCODING="utf-8"        # PowerShell
```
</details>

<details>
<summary><b>notebooklm 返回 <code>AUTH_ERROR</code></b></summary>

登录态过期。自己跑 `notebooklm login`（skill 不代登录），再 `notebooklm auth check --test --json` 确认 `token_fetch: true`。
</details>

<details>
<summary><b>exa / mcporter 超时</b></summary>

冷启动 8–15s，mcporter 单 server 默认 30s 超时。用 `timeout 90 mcporter call ...`，并且一次只发 1–2 个 exa 调用。先 `mcporter list` 看 exa 是否 healthy。
</details>

<details>
<summary><b>Semantic Scholar / dblp / OpenAlex 报错</b></summary>

- `429` → 配 `SEMANTIC_SCHOLAR_API_KEY`，或改用 `asta-skill` / arXiv；
- `dblp` 返回 HTML、`openalex` fetch failed → 网络层被拦，放弃这两个适配器，用 arXiv + `exa` 的 `site:dblp.org` 查询。
</details>

<details>
<summary><b>gemini 报 <code>IneligibleTierError</code></b></summary>

该 CLI 已不适用于个人版 Gemini Code Assist，**不要调用**。需要 Google 系结果时用 `opencli google` 或 exa。
</details>

<details>
<summary><b>报告写不出来 / 目录不存在</b></summary>

`new-report.mjs` 会自动 `mkdir -p`；文件名里的 `\ / : * ? " < > |` 会被清洗成 `-`；同名文件自动加 `_2`，或加 `--force` 覆盖。
</details>

<details>
<summary><b>想只读、绝不误操作？</b></summary>

skill 的铁律：只执行 `[read]` 命令。`bili like/coin/triple/follow`、`opencli * comment/like/favorite/follow`、`notebooklm delete/share` 全部禁止；CLI agent 一律用只读沙箱（`--permission-mode plan` / `-s read-only`）。
</details>

## 安全与边界

- **只读检索**：只搜索、浏览、阅读、提取。不点赞、不收藏、不评论、不转发、不发帖、不私信、不关注、不投币。
- **不代登录**：遇到 `login required` 就停下并告知，绝不处理 cookie / token。
- **NotebookLM 写操作**（建本 / 加源 / 生成）仅在用户明确要求时执行；删除、分享、改语言永不自动执行。
- **可追溯**：只写命令实际返回的内容；取不到就写「未取到」并说明原因，不编造链接。
- **不污染仓库**：原始输出只放 `${TEMP}/researchkit/<slug>/`，唯一交付物是那份 Markdown 报告。

## 相关 skill

本 skill 负责**编排与落盘**；平台专属任务优先用专门 skill：

| 任务 | 用 |
| --- | --- |
| 下载论文 PDF | `paper-fetch` |
| Semantic Scholar 语料 | `asta-skill` / `semanticscholar-skill` |
| B 站视频取帧 / 角色聚类 | `bangumi-frames` |
| 需要真实浏览器交互 | `tabbit` / `playwright` |

## License

[MIT](LICENSE)

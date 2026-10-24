---
name: researchkit
description: 终端聚合调研路由器。当用户说“调研/搜索/查一下/深度研究/全网看看/竞品对比/技术选型/看看大家怎么评价”，或点名 B站、YouTube、知乎、小红书、V2EX、Hacker News、Reddit、X、Google、Google Scholar、arXiv、GitHub、NotebookLM、播客/字幕时使用。它把本机已装的 CLI（opencli、bili、notebooklm-py、agent-reach、gh、mcporter/exa、yt-dlp、claude/codex/oracle）编排成一次调研，并把结果写成规范 Markdown（H1=工具名，H2/H3=调研结果）落到报告文件。不做写操作，不发布、不点赞、不评论。
metadata:
  version: 0.2.0
  platform: windows, macos, linux
  entry: SKILL.md
---

# ResearchKit — 终端聚合调研

一个入口，编排本机所有“能查东西”的 CLI，产出**一份带工具归属的 Markdown 调研报告**。
所有路径以**本 skill 目录**为基准（下文记为 `<SKILL_DIR>`，即本文件所在目录）。
报告输出目录由 `--out` > `RESEARCHKIT_OUT_DIR` > `<SKILL_DIR>/config.json` 的 `outDir` > `~/researchkit-reports` 决定。

## 何时用

- 用户要**调研 / 搜索 / 查资料 / 对比 / 看口碑 / 找论文 / 看视频怎么说**；
- 需要**多个来源交叉验证**，而不是单次搜索；
- 需要把结论**落成 MD 文件**存档（默认 `~/researchkit-reports/`，可用 `RESEARCHKIT_OUT_DIR` 指向 Obsidian vault）。

不适用：纯写作、翻译、代码修改、发帖/评论/点赞等写操作。

## 依赖（缺了会自动降级，不阻塞）

| 能力 | 命令 | 安装 |
| --- | --- | --- |
| 跑脚本（必需） | `node` | Node ≥ 18 |
| 网页搜索 | `mcporter`（exa） | `npm i -g mcporter` + `mcporter config add exa https://mcp.exa.ai/mcp` |
| 多站点 / 学术 / 社区 | `opencli` | `npm i -g @jackwener/opencli`（浏览器类适配器需 Chrome 扩展） |
| B 站 | `bili` | `uv tool install bilibili-cli` |
| NotebookLM | `notebooklm` | `uv tool install "notebooklm-py[browser]"` + `notebooklm login` |
| GitHub | `gh` | `winget install GitHub.cli` / `brew install gh` + `gh auth login` |
| 视频字幕 | `yt-dlp` | `uv tool install yt-dlp` |
| 平台路由 / 转录 | `agent-reach` | `uv tool install agent-reach` + `agent-reach install` |
| 第二模型 | `claude` / `codex` / `oracle` / `grok` | 见 README |

完整安装与配置见仓库 `README.md`。缺后端时按路由表选替代品，不要卡住。

## 铁律（每次都要遵守）

1. **只读。** 只执行标注 `[read]` 的命令。**绝不**执行 `[write]` 命令：点赞、投币、三连、收藏、关注、评论、发帖、私信、转发、删除、分享。`bili like/coin/triple/follow/dynamic-post`、`opencli * comment/like/favorite/follow/subscribe`、`notebooklm delete/share remove` 一律禁止。
2. **先探活，再路由。** 不要凭记忆猜命令；跑一次 `probe.mjs` 看哪些后端真的可用。
3. **不编造。** 只写命令实际返回的内容；取不到就写「未取到」并说明原因。链接必须来自返回结果。
4. **一条命令一个意图。** 不要把同义词塞进一个查询串；中英文各搜一次比堆词有效。
5. **结果必须落盘。** 调研类任务不允许只在终端里讲完。
6. **终端只输出摘要 + 路径。** 摘要 ≤200 字，附报告绝对路径；完整内容写进文件。
7. **不用子智能体。** Pi 自己调用 CLI。`claude -p` / `codex exec` 只是“外部模型工具”，仅在需要第二模型深挖时用，并给只读沙箱。
8. **不替用户登录。** 遇到 `login required` 就停下，报告哪个平台需要登录，让用户自己登录。

## Step 0 — 探活（约 5 秒）

```bash
node "<SKILL_DIR>/scripts/probe.mjs" --deep
```

读 `tools.*.available`、`checks.*.ok`、`warnings`、`recommended`。典型结论：

- `checks.opencli_bridge.ok === false` → 走浏览器的 `opencli google/zhihu/xiaohongshu/notebooklm/...` 会报 `BROWSER_CONNECT (69)`；改用 exa / jina / bili / notebooklm-py。
  **但** `opencli arxiv / pubmed / wikipedia / hackernews / npm` 是纯 HTTP，无桥照常可用。
- `checks.notebooklm_auth.ok === false` → 不要调用 notebooklm，改用 opencli notebooklm（需桥）或普通网页检索。
- `tools.gemini.available` 不代表可用：本机 gemini 认证已失效（`IneligibleTierError`），**不要调用**。

同一次会话内只需探活一次，除非报错涉及后端可用性。

## Step 1 — 选工具（路由表）

按意图选 **2–4 个**互补后端，不要把所有工具都跑一遍。

| 意图 | 首选 | 兜底 | 详见 |
| --- | --- | --- | --- |
| 通用网页搜索 / 事实核查（中英） | `mcporter` → exa | `opencli google`（需桥） | [10](references/10-web-search.md) |
| 中文新闻 / 热搜 / 趋势 | `opencli google news/trends --lang zh` | exa + jina | [10](references/10-web-search.md) |
| 读某个 URL 正文 | `opencli web read --stdout` | `curl -sL https://r.jina.ai/<URL>` | [10](references/10-web-search.md) |
| B站视频 / UP主 / 字幕 / 评论 | `bili` | `opencli bilibili`（需桥） | [20](references/20-bilibili-video.md) |
| YouTube / 播客字幕 | `opencli youtube transcript` / `yt-dlp` | `agent-reach transcribe` | [20](references/20-bilibili-video.md) |
| 深度调研 / 长文档问答 / 带引用结论 | `notebooklm-py` | `opencli notebooklm`（需桥） | [30](references/30-notebooklm.md) |
| 社区口碑（知乎/小红书/微博/V2EX/HN/Reddit/X） | `opencli <site>` | `agent-reach` 对应平台；X/最新动态用 `grok -p` | [40](references/40-community.md) |
| 代码 / 仓库 / Issue | `gh search` | `opencli github`（需桥） | [60](references/60-academic-code.md) |
| 论文（arXiv / PubMed） | `opencli arxiv`、`opencli pubmed`（**无需桥**） | `paper-fetch`、`asta-skill`、`semanticscholar-skill` | [60](references/60-academic-code.md) |
| 论文（Google Scholar 引用/作者） | `opencli google-scholar`（需桥） | exa `site:scholar.google.com` | [60](references/60-academic-code.md) |
| 需要第二模型深挖 / 长文综合 | `claude -p`、`codex exec`、`oracle` | `grok -p`（自带联网）；不调用 gemini | [50](references/50-cli-agents.md) |
| 百科背景 | `opencli wikipedia`（**无需桥**） | `curl` Wikipedia REST API / exa | [10](references/10-web-search.md) |

**组合原则**：一手（官方/论文/仓库）+ 二手（媒体/社区）+ 中文语境（B站/知乎/小红书）各取一个；同一结论至少两个独立来源。

## Step 2 — 执行（并行）

用 codemode 一次发起多个独立 `bash` 调用（`Promise.allSettled`），或在一个 bash 里后台并行。**每条命令都把完整输出重定向到缓存文件**，终端只看摘要，避免 50KB 截断。

```bash
SLUG="agent-memory"                     # 用主题的英文短横线形式
CACHE="${TEMP:-/tmp}/researchkit/$SLUG"
mkdir -p "$CACHE"
export PYTHONIOENCODING=utf-8           # bili/notebooklm 必需，否则 GBK 报错

# 1) 通用网页
timeout 90 mcporter call 'exa.web_search_exa(query: "AI agent memory 2026", numResults: 6)' \
  > "$CACHE/exa.txt" 2> "$CACHE/exa.err"

# 2) B站
timeout 90 bili search "AI Agent 记忆" --type video -n 8 --json \
  > "$CACHE/bilibili.json" 2> "$CACHE/bilibili.err"

# 3) 社区（桥可用时）
timeout 90 opencli zhihu search "Agent 记忆" --limit 8 -f yaml \
  > "$CACHE/zhihu.yaml" 2> "$CACHE/zhihu.err"

# 4) 正文
timeout 60 curl -sL "https://r.jina.ai/https://example.com/post" > "$CACHE/page.md" 2>&1
```

执行后先 `head -c`/`grep` 检查每条是否成功（`bili` 看 `"ok": true`，opencli 看 `ok: false` / `BROWSER_CONNECT`），失败的直接进失败阶梯，不要重试三次以上。

**查询写法**：中文一次、英文一次；站内搜索用 2–5 个关键词；需要时效就带年份/月份；`--limit 5~10` 足够，先宽后窄。

## Step 3 — 落盘

```bash
node "<SKILL_DIR>/scripts/new-report.mjs" \
  --topic "Agent 记忆方案对比" \
  --tools exa,bilibili,zhihu \
  --query "2026 年 AI Agent 记忆方案有哪些主流做法？"
```

输出绝对路径（默认目录 `~/researchkit-reports/`，可用 `RESEARCHKIT_OUT_DIR` 或 `config.json` 覆盖；文件名 `YYYYMMDD_核心主题.md`）。
随后逐节填充；也可以直接 `write` 完整文件，但**必须**遵守 [90-report-format.md](references/90-report-format.md)：

```markdown
---
title: "…"
query: "…"
created: 2026-10-20T20:10:00+08:00
tools:
  - exa
  - bilibili
status: draft
---

# exa

## 查询与参数
- 命令：`mcporter call 'exa.web_search_exa(...)'`
- 时间：20:10

## 结果
### 要点
### 证据
| 序号 | 标题 | 来源/链接 | 时间 | 关键信息 |

# bilibili

## 查询与参数
## 结果
### 要点
### 证据

# 汇总

## 一致结论
## 分歧与不确定性
## 缺口与后续
## 参考来源
```

硬性要求：

- **H1 只能是“实际返回了结果的工具名”**（`exa`、`bilibili`、`notebooklm`、`zhihu`、`claude`…），最后一个 `# 汇总` 除外。
- 失败/未使用的工具不要留空标题，写进 `# 汇总 → 缺口与后续`。
- H2 用固定小节（查询与参数 / 结果 / 观察），H3 放具体条目；每条结论后跟链接。
- 写完把 frontmatter `status` 改为 `complete`。

## Step 4 — 汇总

`# 汇总` 只写跨工具的东西：一致结论、冲突点、证据强度、没查到的缺口、建议的下一步。
不要重复各工具章节的细节；不要引入任何工具没返回过的事实。

## Step 5 — 终端输出

```
已完成 3 个后端（exa / bilibili / zhihu）的交叉调研：主流方案集中在 A、B 两类，A 在生产案例更多，B 在中文社区讨论更热；NotebookLM 未参与（认证不可用）。
报告：<输出目录>/20261020_Agent记忆方案对比.md
```

≤200 字，先结论后路径；**不要在终端贴报告全文**。

## 失败阶梯

| 现象 | 处理 |
| --- | --- |
| `BROWSER_CONNECT` / `opencli doctor` 扩展未连接 | 放弃 opencli 浏览器类适配器 → exa / jina / bili / notebooklm-py / gh；可提示用户加载扩展（一次性） |
| `UnicodeEncodeError: 'gbk'` | `export PYTHONIOENCODING=utf-8` 后重跑 |
| `429 Too Many Requests` | 退避 10–30s 或换后端；Semantic Scholar 建议配 API key |
| `login required` / `not authenticated` | 停止该后端，报告需要登录，不代登录 |
| `gemini ... IneligibleTierError` | 不要用 gemini；换 claude/codex/oracle |
| 命令超时 | 缩小 `--limit`，或换更轻的后端；记录「未取到」 |
| 中文页面乱码/空正文 | 换 jina reader；仍空则记录 URL 并标注未取到 |

更多细节见 [95-troubleshooting.md](references/95-troubleshooting.md)。

## 参考索引

| 文件 | 内容 |
| --- | --- |
| [00-environment.md](references/00-environment.md) | 本机后端清单、路径、编码、探活字段 |
| [10-web-search.md](references/10-web-search.md) | exa / opencli google / jina / Wikipedia / HN |
| [20-bilibili-video.md](references/20-bilibili-video.md) | bili、opencli bilibili、YouTube、转录 |
| [30-notebooklm.md](references/30-notebooklm.md) | notebooklm-py 深调研全流程 |
| [40-community.md](references/40-community.md) | 知乎/小红书/X/Reddit/V2EX/HN/微博 |
| [50-cli-agents.md](references/50-cli-agents.md) | claude / codex / oracle 只读调研 |
| [60-academic-code.md](references/60-academic-code.md) | Scholar / arXiv / PubMed / GitHub |
| [90-report-format.md](references/90-report-format.md) | 报告模板与验收清单 |
| [95-troubleshooting.md](references/95-troubleshooting.md) | 报错对照表与修复 |

> 平台专属 skill 优先：论文 PDF 用 `paper-fetch`，Semantic Scholar 用 `semanticscholar-skill`/`asta-skill`，B站取帧用 `bangumi-frames`，需要浏览器交互用 `tabbit`/`playwright`。本 skill 负责编排与落盘。

# 00 · 本机环境与探活

> 校验时间：2026-10-20（Windows 11，Git Bash）。环境会变，**每次调研以 `probe.mjs` 的输出为准**，本文件只解释字段和已知坑。

## 探活

```bash
node "<SKILL_DIR>/scripts/probe.mjs"          # 快速：PATH + 版本
node "<SKILL_DIR>/scripts/probe.mjs" --deep   # 追加：opencli 桥、notebooklm 认证、exa
node "<SKILL_DIR>/scripts/probe.mjs" --table  # 人读
```

关键字段：

| 字段 | 含义 | 为 false 时怎么办 |
| --- | --- | --- |
| `tools.<id>.available` | 命令在 PATH 中 | 换后端，或按本文件“修复” |
| `checks.opencli_bridge.ok` | Chrome 扩展已连接 | 放弃 `opencli <site>`，走 exa/jina/bili/notebooklm |
| `checks.notebooklm_auth.ok` | 服务端 token 校验通过（`auth check --test`，`token_fetch=true`） | 让用户 `notebooklm login`，或不用 NotebookLM |
| `checks.exa.ok` | mcporter 的 exa server 健康 | 网页搜索退到 jina / opencli google |
| `recommended` | 本次建议后端 | 直接照用 |

## 后端清单（本机实测）

| id | 命令 | 版本/路径 | 状态 | 用途 |
| --- | --- | --- | --- | --- |
| opencli | `opencli` | 1.8.8（npm 全局） | ⚠️ 浏览器桥未连接；HTTP 类适配器正常 | 169 个站点适配器（见下方“有桥/无桥”） |
| bili | `bili` | 0.6.2（uv tool `bilibili-cli`） | ✅ 可用，无需登录 | B站搜索、视频详情、字幕、评论、热门、排行 |
| notebooklm | `notebooklm` | 0.8.5（uv tool `notebooklm-py`） | ⚠️ 本地 cookie 存在，但服务端登录已过期（2026-10-21 `list` 返回 `AUTH_ERROR`） | 先 `notebooklm login`；否则改用普通网页检索 |
| agent-reach | `agent-reach` | v1.5.0（`~/.agent-reach-venv`） | ✅ | 平台路由 `doctor`、`transcribe`、`format` |
| exa | `mcporter call 'exa...'` | mcporter 0.14.3 | ✅（冷启动 ~10s） | 语义网页搜索 + 正文抓取，最适合英文/技术话题 |
| gh | `gh` | 2.102.0 | ✅ 已登录 | 仓库/代码/Issue/PR 搜索 |
| claude | `claude` | 2.1.304 | ✅ `-p` 可用 | 外部模型综合、长文审阅 |
| codex | `codex` | 0.163.0 | ✅ `exec` 可用 | 外部模型综合（`-s read-only`） |
| oracle | `oracle` | 0.21.6 | 需 ChatGPT 登录/API | 第二模型复核（GPT 系 + 浏览器研究） |
| grok | `grok` | 已安装 | ✅ `grok -p` 实测可用，自带 web search | X/最新动态、英文资料快速综述 |
| gemini | `gemini` | 0.64.0 | ❌ 认证失效 `IneligibleTierError` | **不要用**，官方已要求迁移 Antigravity |
| yt-dlp | `yt-dlp` | 2026.08.19 | ✅ | YouTube 字幕/音频；B站请优先 `bili` |
| tabbit-cli | `%LOCALAPPDATA%\Tabbit\LocalAgent\bin\tabbit-cli.exe` | — | 视安装而定 | 需要真实浏览器交互时的只读浏览 |
| curl | `curl` | 8.19.0（Git） | ✅ | 公开 API、Jina Reader |

### opencli 适配器的两种命运

| 无桥可用（直接 HTTP） | 需要浏览器桥 |
| --- | --- |
| `arxiv`、`pubmed`、`wikipedia`、`hackernews`、`npm`、`pypi`、`crates` | `google`、`google-scholar`、`duckduckgo`、`zhihu`、`xiaohongshu`、`twitter`、`reddit`、`weibo`、`bilibili`、`notebooklm`、`web read`、`youtube` |

实测反例：`semanticscholar` → HTTP 429（需 key）；`dblp` → 返回 HTML；`openalex` → `fetch failed`。这三个别用。

## 已知坑（按出现频率）

1. **GBK 编码**：`bili` / `notebooklm` 在 Git Bash 默认代码页下会 `UnicodeEncodeError: 'gbk' codec can't encode character`。
   解决：`export PYTHONIOENCODING=utf-8`（本 skill 的所有示例都带）。
2. **opencli 浏览器桥**：`opencli doctor` 显示 `Extension: not connected` 时，所有走浏览器的适配器返回
   `{"ok": false, "error": {"code": "BROWSER_CONNECT"}, "exitCode": 69}`。需要 Chrome 运行并加载 OpenCLI 扩展（一次性）。
   没加载就用无桥后端，不要反复重试。
3. **notebooklm-py 的 uv tool 可能装成空壳**（`Scripts/` 里没有 `notebooklm.exe`）。
   修复：`uv tool install --force "notebooklm-py[browser]"`，再 `notebooklm auth check --json`。
4. **exa 冷启动**：首次 `mcporter call` 可能 8–15s，命令超时设 ≥60s。
5. **Semantic Scholar 无 key 会 429**：退避或改用 `asta-skill` / arXiv。
6. **路径**：Windows 上 `D:/...` 与 `/d/...` 都可用；写文件用 `D:/...` 更稳。
7. **临时文件**：一律放 `${TEMP:-/tmp}/researchkit/<slug>/`，不要污染报告目录和项目目录。

## 缓存与产物

```
${TEMP}/researchkit/<slug>/        # 原始输出：exa.txt、bilibili.json、zhihu.yaml、*.err
<报告输出目录>/                      # 唯一交付物：YYYYMMDD_核心主题.md
```

报告输出目录：`--out` > `RESEARCHKIT_OUT_DIR` > `<SKILL_DIR>/config.json` 的 `outDir` > `~/researchkit-reports`。
原始输出保留到报告写完为止，便于回查；不要写进 vault。

## 安全边界

- 只读检索：搜索、浏览、阅读、提取。
- 禁止：点赞、收藏、评论、回复、转发、发帖、私信、关注、投币、三连、删除、分享。
- NotebookLM 的“建本 / 加源”属于对用户账号的写入：**仅在用户明确要求 NotebookLM 深调研时**执行；`delete`、`share`、`language set` 永不自动执行。
- 不代替用户登录任何平台；不打印、不复制 cookie / token。

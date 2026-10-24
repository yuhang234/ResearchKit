# 95 · 报错对照与修复

## 快速决策树

```
命令失败
├─ BROWSER_CONNECT (69) ──────► 浏览器桥没连：换无桥后端（exa / jina / bili / notebooklm / gh / arxiv / pubmed）
├─ UnicodeEncodeError 'gbk' ──► export PYTHONIOENCODING=utf-8
├─ command not found ─────────► probe.mjs 看是否安装；notebooklm 走 uv tool 修复
├─ 401/403/login required ────► 停，报告需要登录，不代登录
├─ 429 ───────────────────────► 退避 10–30s；换后端；S2 配 key
├─ timeout ───────────────────► 降 --limit、缩 URL 批量、换轻后端
├─ 返回 HTML 而不是 JSON ─────► 被反爬/被墙：放弃该适配器，改 exa site: 查询
└─ 空结果 ────────────────────► 换语言/换关键词/加年份；记录“未取到”
```

## 实测报错

### `BROWSER_CONNECT` / `exitCode: 69`

```json
{"ok": false, "error": {"code": "BROWSER_CONNECT",
 "message": "Browser Bridge extension not connected"}}
```

原因：Chrome/Chromium 没运行，或没加载 OpenCLI 扩展。
处理：`opencli doctor` 确认；**不要重试**，改用 exa / Jina / bili / notebooklm / gh / arxiv / pubmed / wikipedia / hackernews。
一次性修复（需用户操作）：Chrome → `chrome://extensions` → 开发者模式 → 加载 OpenCLI 扩展。

### `UnicodeEncodeError: 'gbk' codec can't encode character`

`bili --help`、`notebooklm` 在默认代码页会崩。
处理：

```bash
export PYTHONIOENCODING=utf-8
```

所有 Python CLI 命令前都带上（或写进当前 shell 会话）。

### `notebooklm: command not found` / uv tool 装成空壳

`Scripts/` 只有 `python.exe`，没有 `notebooklm.exe`。修复：

```bash
uv tool install --force "notebooklm-py[browser]"
notebooklm --version
notebooklm auth check --json
```

仍失败：`pipx install "notebooklm-py[browser]"` 或 `pip install --user`。

### `IneligibleTierError`（gemini）

```
This client is no longer supported for Gemini Code Assist for individuals.
```

本机 gemini CLI 已不可用。**不要调用**，不要尝试 `--yolo`。用 `opencli google` / exa 替代。

### `429` Semantic Scholar

```
semanticscholar search returned HTTP 429 (rate limited)
```

设置 `SEMANTIC_SCHOLAR_API_KEY`（免费申请），或改用 `asta-skill` / `semanticscholar-skill` / arXiv。

### `dblp search returned malformed JSON` / `openalex request failed`

网络层被拦（返回 HTML / fetch failed）。放弃这两个适配器，用 arXiv + `exa` 的 `site:dblp.org`。

### exa / mcporter 超时

冷启动 8–15s；`mcporter` 默认单 server 超时 30s。
处理：`timeout 90 mcporter call ...`，一次只发 1–2 个 exa 调用；失败再 `mcporter list` 看 exa 是否 healthy。

### claude 的模型警告

```
Claude Code doesn't recognize the model "…", so it assumes a context window of 200k tokens.
```

这是自定义网关的提示，不影响输出；不要因此重试。取答案时 `tail -5`，忽略前面的告警。

### codex 输出夹带 hook 日志

```
hook: Stop
hook: Stop Completed
tokens used
8,738
```

用 `-o "$CACHE/codex_last.md"` 只取最后回答，不要解析 stdout 全文。

### Jina Reader 限流 / 空正文

无 key 时限流；连续抓取加 `sleep 1`，或改用 `exa.web_fetch_exa`。
SPA 页面可能返回空，记录 URL 并标“未取到”。

### 引号与换行

`mcporter call` 的参数用单引号包住整串，内部用双引号：

```bash
mcporter call 'exa.web_search_exa(query: "agent memory", numResults: 5)'
```

多行写法在 bash 里可用 `\` 续行，但不要把注释塞进参数串。

### 路径

- Windows：`D:/...` 与 `/d/...` 都可以；写文件优先 `D:/...`。macOS / Linux 用绝对路径。
- `$TEMP` 在 Git Bash 中通常已设置；没有就用 `/tmp`。

### 报告写不出来

- 目录不存在 → 用 `new-report.mjs`（会自动 `mkdir -p`），或手动 `mkdir -p "<输出目录>"`。
- 文件名含 `\/:*?"<>|` → 用 `new-report.mjs` 自动清洗。
- 同名文件 → 脚本自动加 `_2`，或 `--force` 覆盖。

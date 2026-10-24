# 30 · NotebookLM 深调研（notebooklm-py）

NotebookLM 的价值不在“再搜一遍”，而在**把多篇来源装进一个本子，让回答带 `[1][2]` 引用**。
适合：长文档/多论文对比、需要可追溯引用的结论、把一堆链接压成一份 briefing。

> 命令：`notebooklm`（uv tool `notebooklm-py` 0.8.5）。
> 必须 `export PYTHONIOENCODING=utf-8`，否则 Windows 控制台可能 GBK 报错。

## 前置检查

```bash
notebooklm auth check --test --json   # 要求 .status == "ok" 且 .checks.token_fetch == true（服务端校验）
notebooklm doctor                     # profile / 迁移问题
notebooklm list --json                # 现有本子；若返回 AUTH_ERROR 说明登录已过期
```

> 2026-10-21 实测：本地 cookie 仍在，但 `notebooklm list --json` 返回 `AUTH_ERROR`。
> 先让用户执行 `notebooklm login`，登录成功后再跑 research。

认证失败时：让用户执行 `notebooklm login`，不要代登录。并发任务要隔离 profile：
`NOTEBOOKLM_PROFILE=agent-<id>`（新 profile 需自行放入 `master_token.json` 并 mint storage）。

## 模式 A：只读复用现有本子（最省事）

```bash
NLM_ID="<完整 UUID 或前缀>"

notebooklm metadata -n "$NLM_ID" --json          # 标题 + 来源清单
notebooklm source list -n "$NLM_ID" --json       # 来源状态/类型/URL
notebooklm summary -n "$NLM_ID" --topics --json  # 本子摘要 + 建议主题
notebooklm history -n "$NLM_ID" --json           # 历史问答
notebooklm ask -n "$NLM_ID" "这些来源对 X 的结论是否一致？列出分歧。" --json
```

`ask --json` 返回答案 + 引用来源 ID；写报告时把 `[n]` 映射回 `source list` 里的 URL。

**不要**用 `notebooklm use` 改全局上下文；自动化里始终显式 `-n`。

## 模式 B：新主题深调研（会写入用户账号，需用户明确要求）

```bash
# 1) 建本（--use 会改当前上下文；自动化建议不加，只拿 id）
notebooklm create "调研-Agent记忆方案" --json > "$CACHE/nlm_create.json"

# 2) 起一次 deep research，并导入被引用的来源
notebooklm source add-research "AI agent memory architectures 2026" \
  -n "$NLM_ID" --mode deep --import-all --cited-only \
  --timeout 1800 --json > "$CACHE/nlm_research.json"

# 3) 等每个来源 ready（用返回的 source id）
notebooklm source wait <source_id> -n "$NLM_ID" --timeout 300 --json

# 4) 带引用问答
notebooklm ask -n "$NLM_ID" "对比这些来源的记忆架构，给出 3 条有证据的结论。" --json \
  > "$CACHE/nlm_ask.json"

# 5) 需要成稿时生成 briefing（异步，拿 task_id）
notebooklm generate report "写一份 800 字的技术对比简报，标注引用" -n "$NLM_ID" --json \
  > "$CACHE/nlm_report_task.json"
notebooklm artifact wait <task_id> -n "$NLM_ID" --json
notebooklm download report "$CACHE/nlm_report.md" -n "$NLM_ID" -a <artifact_id>
```

要点：

- `add-research` 是**写操作**（建源），只在用户明确要“用 NotebookLM 做深调研”时执行；不要自动建本。
- deep 模式可能跑几分钟，`--timeout` 给足（1800）；不要在前台干等，可先做别的后端。
- `research status` / `research wait` 用于监控；`--no-wait` 后自己轮询也可以。
- `artifact wait` 用**返回的 task id**，下载用**对应的 artifact id**，不要“下载最新的”。
- 失败时先跑只读的 `source list` 看有没有卡在 `preparing`/`error` 的来源。

## 模式 C：快速来源发现（同步 ~8s）

```bash
notebooklm research discover "agent memory 2026 对比" -n "$NLM_ID" --json
```

一次往返返回排序后的候选来源 + 概述，适合“先看看有哪些材料”，不导入。

## 边界

| 可以做 | 需要用户明确同意 | 永不自动做 |
| --- | --- | --- |
| `list` / `metadata` / `source list` / `summary` / `ask` / `history` / `research discover` | `create`、`source add`、`source add-research`、`generate *`、`download *`、`ask --new` | `delete`、`share remove`、`language set`、`logout`、`clear` |

`ask --new` 会删除服务端当前会话（不可恢复），除非用户要求“重新开一轮”，否则不要加。

## 报告归属

H1 写 `notebooklm`；H2 放「本子与来源」「问答结论」「引用映射」；每条结论后用 `[n] → URL` 标注。
不要把 NotebookLM 的答案当成一手证据——它只是**对你导入来源的归纳**，来源链接才是证据。

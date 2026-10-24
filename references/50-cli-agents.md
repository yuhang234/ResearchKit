# 50 · 外部 CLI Agent（只读调研助手）

用途：把 ResearchKit 已经抓到的原始材料丢给另一个模型，做**交叉综合、找矛盾、补盲区、写结构化摘要**。
不要把它当成“更聪明的搜索框”——本机 `claude` / `codex` 都接在自定义模型网关上（实测为 DeepSeek 系），
**不一定带联网工具**。先探测能力，再决定让它检索还是综合。

## 先探测：它到底能不能联网

```bash
claude -p "只回答：你是否有联网搜索工具？有就回答 YES，没有回答 NO" 2>/dev/null | tail -3
codex exec --skip-git-repo-check -s read-only "只回答：你是否有联网搜索工具？有就回答 YES，没有回答 NO" 2>/dev/null | tail -3
```

回答 NO 就只做综合；回答 YES 也必须限定“只读、只引用 URL、不要执行任何写操作”。

## grok（自带联网，优先用于 X / 最新动态）

`grok` 是唯一实测**自带 web search** 的 CLI agent（2026-10-21 `grok -p ... --output-format plain` 返回正常）。
适合：X/Twitter 讨论、最新动态、英文资料快速综述。

```bash
timeout 300 grok -p "调研：<问题>。只做网络检索与阅读，不修改任何文件。输出：1) 结论 2) 关键事实 3) 来源 URL 与日期 4) 事实/推断分开。" \
  --output-format plain \
  --disallowed-tools write,edit,bash \
  --cwd "$CACHE" > "$CACHE/grok.md" 2> "$CACHE/grok.err"
```

- `--disallowed-tools write,edit,bash` 降低误改文件风险；仍在临时目录运行。
- 不要加 `--disable-web-search`。
- 报告 H1 写 `grok`，小节注明“外部 CLI agent，自带 web search”。

## claude（`claude -p`）

```bash
timeout 300 claude -p "阅读下面三份材料，找出结论冲突，按可信度排序，输出 Markdown：
<<<
$(cat "$CACHE/exa.txt")
$(cat "$CACHE/bilibili.json")
$(cat "$CACHE/zhihu.yaml")
>>>" --permission-mode plan > "$CACHE/claude.md" 2> "$CACHE/claude.err"
```

- `--permission-mode plan`：只读规划模式，禁止改文件。
- 长材料走 stdin 更稳：`cat "$CACHE/all.md" | claude -p "…" --permission-mode plan`。
- 需要限定工具时用 `--allowedTools "Read"`（不要给 Bash/Write）。

## codex（`codex exec`）

```bash
timeout 300 codex exec --skip-git-repo-check -s read-only -C "$CACHE" \
  -o "$CACHE/codex_last.md" \
  "阅读本目录下的 exa.txt / bilibili.json，输出：1) 一致结论 2) 冲突点 3) 缺失证据。只引用材料中出现的内容。" \
  > "$CACHE/codex.log" 2>&1
```

- `-s read-only`：沙箱只读。
- `-o`：把最后一条回答单独写文件，便于引用。
- `--skip-git-repo-check`：临时目录不是 git 仓库时必需。
- 想省 token：`-c model_reasoning_effort="medium"`。

## oracle（第二模型复核，可选）

```bash
timeout 300 oracle -p "复核这份调研的推理漏洞，列出 5 条最可能错误的结论" \
  -f "$CACHE/exa.txt" "$CACHE/bilibili.json" --timeout 240 > "$CACHE/oracle.md" 2>&1
```

oracle 走 ChatGPT（需登录/API）。`--browser-research search` 可开启浏览器侧搜索，但会启动浏览器，**非必要不用**。

## gemini（本机不可用）

`gemini -p ...` 会报：

```
IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals.
```

不要调用，也不要尝试 `--yolo` 绕过。需要 Google 系结果时用 `opencli google` / exa。

## 使用规则

1. **喂料而非许愿**：把已抓到的文本/JSON 作为输入，要求“只基于材料回答”。
2. **只读沙箱**：`--permission-mode plan` / `-s read-only`；不给写权限。
3. **必须可追溯**：要求输出里保留原始 URL 或来源标题；没有来源的结论标 `[无来源]`。
4. **超时**：300s；超时就缩小输入（只喂 top 5 条）。
5. **归属**：报告 H1 写 `claude` / `codex` / `oracle`，并在小节里说明“输入来自哪些后端”。
6. **不循环**：不要让 CLI agent 再去调用 ResearchKit，避免递归。

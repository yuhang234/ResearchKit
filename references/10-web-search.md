# 10 · 网页搜索与正文阅读

## 选择顺序

1. **exa**（mcporter）：语义搜索 + 正文抓取，无需浏览器，英文/技术话题最强。
2. **opencli google / web read**：中文结果、Google 新闻/趋势、任意页面转 Markdown；**依赖浏览器桥**。
3. **Jina Reader**：无桥、无 key 的正文兜底。
4. **Wikipedia REST**：背景/定义。
5. **HN Algolia**：技术圈讨论。

---

## exa（首选，无需浏览器）

```bash
# 搜索：query 写“理想页面”的描述，而不是关键词堆砌
timeout 90 mcporter call 'exa.web_search_exa(
  query: "engineering blog post comparing AI agent memory architectures",
  numResults: 6,
  objective: "找出主流记忆架构的实现细节和生产案例"
)' > "$CACHE/exa.txt" 2> "$CACHE/exa.err"

# 读正文：批量传 URL，maxCharacters 按需放大
timeout 90 mcporter call 'exa.web_fetch_exa(
  urls: ["https://example.com/a", "https://example.com/b"],
  maxCharacters: 6000
)' > "$CACHE/exa_fetch.txt" 2> "$CACHE/exa_fetch.err"
```

返回是“Title / URL / Published / Author / Highlights / 正文”。提取：标题、URL、日期、3–5 条事实。

注意：
- 冷启动 8–15s，超时设 ≥60s；并行调用 2 个以内，避免互相拖慢。
- 输出可能被 mcporter 截断，重要 URL 再用 `web_fetch_exa` 单独抓。

---

## opencli google（需桥）

```bash
opencli google search "AI agent memory" --limit 10 --lang zh -f yaml
opencli google news "AI agent" --limit 10 -f yaml
opencli google trends -f yaml
opencli google images "agent memory diagram" --limit 5 -f yaml
opencli google suggest "agent memory" -f yaml
```

`--lang zh` 拿中文结果，`--lang en` 拿英文；`-f yaml` 比 `table` 省 token。
桥未连接时会返回 `BROWSER_CONNECT`，**不要重试**，直接切 exa/Jina。

## opencli web read（需桥）

```bash
opencli web read --url "https://example.com/post" --stdout true > "$CACHE/page.md"
```

适合公众号、掘金、Medium 等正文型页面；`--wait-for "<css>"` 可等懒加载。
默认会把图片下载到 `./web-articles`，批量任务时加 `--download-images false` 保持干净。

## Jina Reader（兜底，无需浏览器）

```bash
curl -sL "https://r.jina.ai/https://example.com/post" > "$CACHE/page.md"
```

返回 Markdown（含 `Title / URL Source / Published Time / Markdown Content`）。
无 key 有速率限制；连续抓 5 个以上 URL 时串行 + `sleep 1`。

## Wikipedia（背景）

```bash
curl -s "https://zh.wikipedia.org/api/rest_v1/page/summary/NotebookLM" > "$CACHE/wiki.json"
curl -s "https://en.wikipedia.org/api/rest_v1/page/summary/Retrieval-augmented_generation" > "$CACHE/wiki_en.json"
```

只取定义和背景，不作为事实的唯一来源。

## Hacker News（技术讨论）

```bash
# 无桥：Algolia 公开 API
curl -s "https://hn.algolia.com/api/v1/search?query=notebooklm&hitsPerPage=10" > "$CACHE/hn.json"

# 有桥：结构化
opencli hackernews search "notebooklm" -f yaml
opencli hackernews top --limit 10 -f yaml
opencli hackernews read <id> -f yaml
```

## 提取模板

每个来源至少记：

```text
标题 | URL | 发布时间 | 作者/机构 | 3 条关键事实 | 与问题的关系（支持/反驳）
```

写入报告时，H1 用后端名（`exa` / `google` / `jina` / `wikipedia` / `hackernews`），不要用“网页搜索”这种泛称。

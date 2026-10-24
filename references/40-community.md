# 40 · 社区口碑与讨论

社区的作用是**发现一手来源没说的坑、真实使用体验、争议点**。不要用社区结论替代一手证据，只用来交叉验证。

> 绝大多数社区适配器走浏览器桥。先 `opencli doctor` 或 `probe.mjs --deep`：
> `Extension: not connected` 时这些命令会返回 `BROWSER_CONNECT (69)`，**直接换方案**，别重试。

## 有桥时的命令

```bash
# 知乎：搜索 / 问题详情 / 热榜
opencli zhihu search "Agent 记忆" --limit 10 -f yaml
opencli zhihu question <question-id> -f yaml
opencli zhihu hot -f yaml
opencli zhihu answer-detail <answer-id> -f yaml

# 小红书：搜索 / 笔记正文 / 评论
opencli xiaohongshu search "Agent 记忆" --sort most-liked --limit 10 -f yaml
opencli xiaohongshu note <note-id> -f yaml
opencli xiaohongshu comments <note-id> --limit 20 -f yaml

# X / Twitter：搜索 / 长文
opencli twitter search "agent memory" --product top --limit 15 -f yaml
opencli twitter article <tweet-id> -f yaml

# Reddit
opencli reddit search "agent memory" --subreddit LocalLLaMA --sort top --time year --limit 15 -f yaml

# V2EX
opencli v2ex hot -f yaml
opencli v2ex topic <id> -f yaml
opencli v2ex replies <id> -f yaml

# 微博 / 豆瓣
opencli weibo hot -f yaml
opencli weibo search "Agent 记忆" -f yaml
opencli douban search "记忆" -f yaml
```

`-f yaml` 比默认表格更适合喂给模型；`--limit 10~15` 足够，社区数据噪音大，多了反而稀释。

## 无桥时的兜底

| 平台 | 兜底方式 |
| --- | --- |
| 知乎 / 小红书 / 微博 | `exa` 加 `site:` 限定，例如 `query: "site:zhihu.com Agent 记忆 实践"`；再用 `web_fetch_exa` 读正文 |
| Reddit | 同上 `site:reddit.com`；Reddit 公开 JSON 常被反爬拦截，不要依赖 |
| V2EX | 公开 API：`curl -s "https://www.v2ex.com/api/topics/hot.json" -H "User-Agent: researchkit/0.1"` |
| Hacker News | `curl -s "https://hn.algolia.com/api/v1/search?query=<q>&hitsPerPage=10"` |
| X | 仅 `opencli`/`twitter-cli` 可用；否则放弃，并在报告缺口里说明 |

## agent-reach（平台路由 + 体检）

```bash
agent-reach doctor --json          # 每个平台的 active_backend
agent-reach format ...             # 格式化平台输出
agent-reach transcribe <url> -o transcript.txt
```

`doctor` 的 `active_backend` 是权威答案：它显示 `OpenCLI` 而桥未连接时，说明该平台当前实际不可用。

## 提取模板

```text
平台 | 标题/问题 | 链接 | 时间 | 作者 | 立场（赞/踩/中立） | 论据类型（实测/转述/情绪） | 可验证的事实点
```

写报告时：

- H1 用平台名（`zhihu`、`xiaohongshu`、`twitter`、`reddit`、`v2ex`）；
- H3 放具体帖子/回答，**必须带链接**；
- 把“很多人说”改写成“3 条高赞回答提到 X（链接…）”，避免把情绪当证据；
- 社区内容与一手来源冲突时，在 `# 汇总 → 分歧与不确定性` 里并列，不要强行调和。

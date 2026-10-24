# 90 · 报告格式契约

## 文件

- 目录：报告输出目录（`--out` > `RESEARCHKIT_OUT_DIR` > `config.json` 的 `outDir` > `~/researchkit-reports`）
- 命名：`YYYYMMDD_核心主题.md`（同日同名自动加 `_2`）
- 编码：UTF-8
- 唯一交付物：一份 MD；原始 JSON/YAML 留在 `${TEMP}/researchkit/<slug>/`，不要放进 vault。

## 层级规则（硬性）

| 层级 | 内容 | 约束 |
| --- | --- | --- |
| frontmatter | `title / query / created / tools / status` | `tools` 必须与实际返回结果的工具一致 |
| `# <工具名>` | 一个**实际执行且拿到结果**的后端 | 用命令名：`exa`、`google`、`bilibili`、`youtube`、`zhihu`、`xiaohongshu`、`notebooklm`、`arxiv`、`github`、`claude`、`codex`… |
| `## 查询与参数` | 命令、参数、执行时间 | 命令用行内代码，可复制 |
| `## 结果` | 调研内容 | 下面用 `###` 分条目 |
| `### <条目>` | 单条结论/单篇材料 | 必须带链接 |
| `# 汇总` | 跨工具综合 | 固定四个 H2 |

- 失败或未使用的工具**不要留空 H1**，写进 `# 汇总 → 缺口与后续`。
- 不要出现“网页搜索”“网络资料”这类泛称 H1。
- 不要嵌套超过 H3；需要更细就用列表。

## 模板

```markdown
---
title: "Agent 记忆方案对比"
query: "2026 年 AI Agent 记忆方案有哪些主流做法？各自代价是什么？"
created: 2026-10-20T20:10:00+08:00
tools:
  - exa
  - bilibili
  - arxiv
status: complete
---

> 调研问题：2026 年 AI Agent 记忆方案有哪些主流做法？各自代价是什么？
> 执行后端：exa（网页）、bilibili（中文视频）、arxiv（论文）

# exa

## 查询与参数

- 命令：`mcporter call 'exa.web_search_exa(query: "AI agent memory architecture comparison", numResults: 6)'`
- 参数：numResults=6，英文
- 执行时间：20:11

## 结果

### 主流方案分为四类

- 向量检索式长期记忆（Mem0 类）：写入便宜，召回依赖 embedding 质量。
- 结构化记忆图谱（Zep/Graphiti）：关系推理强，写入与迁移成本高。
- 上下文压缩/摘要（Letta/MemGPT）：实现简单，长程一致性弱。
- 文件/工作区记忆（Claude Code 类）：可审计，跨会话共享弱。

### 证据

| 序号 | 标题 | 来源/链接 | 时间 | 关键信息 |
| --- | --- | --- | --- | --- |
| 1 | Memory in AI Agents | https://example.com/a | 2026-03 | 对比 4 类方案的成本曲线 |
| 2 | Zep: temporal knowledge graph | https://arxiv.org/abs/2501.xxxxx | 2026-01 | 图谱方案在时序问答上 +18% |

### 观察

- 英文材料普遍把“写入成本”作为第一约束，中文材料更关注“可控性/可审计”。

# bilibili

## 查询与参数

- 命令：`bili search "AI Agent 记忆" --type video -n 8 --json`
- 执行时间：20:12

## 结果

### 中文社区更常用“文件 + 摘要”组合

- BV1bu3v6VEVH《我用AI进行深度调研的方法》提到用工作区文件做跨会话记忆，字幕 03:20 起。
- 评论区反复出现“上下文一长就丢细节”的抱怨（前 20 条评论中 6 条相关）。

### 证据

| 序号 | 标题 | 来源/链接 | 时间 | 关键信息 |
| --- | --- | --- | --- | --- |
| 1 | 我用AI进行深度调研的方法 | https://www.bilibili.com/video/BV1bu3v6VEVH | 2026-09 | 文件式记忆的实操流程 |

# arxiv

## 查询与参数

- 命令：`opencli arxiv search "agent memory" --limit 10 -f yaml`

## 结果

### 近一年论文集中在“时序一致性”

- 2607.13157 提出把记忆作为企业级 substrate，强调长程任务的可恢复性。
- 2605.27825 讨论记忆带来的隐私风险（membership inference）。

# 汇总

## 一致结论

- 没有单一最优方案：写入成本、召回质量、可审计性三者互相制约。
- 生产案例更偏向“向量 + 结构化摘要”的混合方案。

## 分歧与不确定性

- 图谱方案的效果提升多来自厂商自评，缺少独立复现。
- 中文社区样本以创作者经验为主，不代表企业实践。

## 缺口与后续

- 未取到：NotebookLM（认证不可用）、小红书（浏览器桥未连接）。
- 建议补充：找 2 个开源实现的 benchmark，核对图谱方案的 +18%。

## 参考来源

- https://example.com/a
- https://arxiv.org/abs/2501.xxxxx
- https://www.bilibili.com/video/BV1bu3v6VEVH
```

## 写作要求

1. **先结论后证据**：每个工具章节第一段就是该工具给出的核心判断。
2. **数字要带条件**：写“+18%”必须写清数据集/基线，否则改成“报告称有提升”。
3. **冲突并列**：两个来源矛盾时，在 `# 汇总 → 分歧与不确定性` 并列，不要选一个当真。
4. **缺口显式化**：没查到的、失败的、被限流的，全部写进 `缺口与后续`。
5. **不要复制粘贴**：原始输出可能有 50KB，报告只保留支撑结论的 3–5 条证据/工具。
6. **时间**：所有来源尽量带发布时间；没有就写“未标注”。

## 验收清单

- [ ] 文件名符合 `YYYYMMDD_主题.md`，位于报告输出目录
- [ ] frontmatter 的 `tools` 与 H1 一一对应，`status: complete`
- [ ] 每个 H1 都有「查询与参数 / 结果」，命令可复制
- [ ] 至少 3 条带 URL 的证据
- [ ] 有 `# 汇总` 的四个 H2
- [ ] 没有写操作痕迹（点赞/评论/发帖）
- [ ] 终端只输出了 ≤200 字摘要 + 绝对路径

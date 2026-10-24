# 60 · 学术与代码

## 学术检索（按可用性排序）

### 无桥可直接用（本机实测）

```bash
# arXiv：搜索 / 单篇 / 作者 / 分类最新
opencli arxiv search "agent memory" --limit 10 -f yaml
opencli arxiv paper 2607.13157 -f yaml
opencli arxiv author "Yann LeCun" --limit 10 -f yaml
opencli arxiv recent cs.AI --limit 10 -f yaml

# PubMed（生物医学）
opencli pubmed search "agent memory" --limit 10 -f yaml
opencli pubmed review "CAR-T autoimmune" --limit 10 -f yaml
opencli pubmed article 42896926 -f yaml
opencli pubmed citations 42896926 -f yaml
```

返回含 `id/title/authors/published/url`，可直接进报告表格。

### 需要桥

```bash
opencli google-scholar search "agent memory" --limit 10 -f yaml
opencli google-scholar cite "Attention is all you need" -f yaml
opencli google-scholar profile "<author>" -f yaml
```

### 已知不可用 / 需配置

| 后端 | 状态 | 处理 |
| --- | --- | --- |
| `opencli semanticscholar` | HTTP 429（匿名限流） | 设 `SEMANTIC_SCHOLAR_API_KEY`，或改用 `semanticscholar-skill` / `asta-skill` |
| `opencli openalex` | `fetch failed`（网络不可达） | 放弃，用 arXiv + Scholar |
| `opencli dblp` | 返回 HTML（被拦） | 放弃，用 arXiv + `site:dblp.org` 的 exa 查询 |

### 论文全文

- 有 DOI/arXiv id → 用 `paper-fetch` skill 下载 PDF（Unpaywall → arXiv → PMC → 出版社）。
- 引用网络/作者画像 → `asta-skill`（Semantic Scholar 语料）或 `semanticscholar-skill`。
- 只读摘要足够时，直接用上面的 `arxiv paper` / `pubmed article`。

## 代码与仓库

```bash
# 仓库搜索（星标排序）
gh search repos "notebooklm" --sort stars --limit 10 --json fullName,stargazersCount,description,updatedAt

# 代码搜索
gh search code "web_search_exa" --limit 10 --json repository,path

# Issue / PR（找坑和官方态度）
gh search issues "agent memory" --state open --limit 10 --json title,url,updatedAt
gh search prs "memory" --limit 5 --json title,url

# 仓库详情 / README / 最近提交
gh repo view teng-lin/notebooklm-py --json name,description,stargazerCount,pushedAt,url
gh api repos/teng-lin/notebooklm-py/releases/latest --jq '.tag_name, .published_at'
```

`gh` 已登录，无桥依赖；`--json` + `--jq` 比默认表格更省 token。
需要 README 全文：`gh api repos/<owner>/<repo>/readme -H "Accept: application/vnd.github.raw"`。

`opencli github-trending` 不支持 `-f`，用 `gh search repos --sort stars` 或 exa 替代。

## 报告写法

- H1：`arxiv` / `pubmed` / `google-scholar` / `github`。
- H2：查询与参数、结果、观察。
- H3：单篇论文/仓库。
- 论文条目必须带：标题、作者（前 3 + et al.）、年份、venue/分类、URL/DOI、一句话结论、与问题的关系。
- 不要用二手博客替代论文原文；如果只读到摘要，明确写「仅摘要」。

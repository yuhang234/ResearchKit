# 20 · B站 / YouTube / 播客

B站是中文技术内容的重要一手来源：先搜视频，再看**字幕**（比简介信息密度高得多），需要时看评论判断口碑。

> 全程加 `export PYTHONIOENCODING=utf-8`，否则 `bili` 会 GBK 崩溃。

---

## B站：bili（首选，无需登录）

```bash
# 搜视频（--type 默认是 user，务必显式写 video）
PYTHONIOENCODING=utf-8 bili search "AI Agent 记忆" --type video -n 10 --json > "$CACHE/bilibili.json"

# 热门 / 排行
PYTHONIOENCODING=utf-8 bili hot -n 10 --json > "$CACHE/bili_hot.json"
PYTHONIOENCODING=utf-8 bili rank --day 3 -n 10 --json > "$CACHE/bili_rank.json"

# 视频详情 + 字幕 + AI 总结 + 相关推荐（BV 号或 URL）
PYTHONIOENCODING=utf-8 bili video BV1bu3v6VEVH -s --ai -r --json > "$CACHE/bili_video.json"

# 字幕只要纯文本 / SRT
PYTHONIOENCODING=utf-8 bili video BV1bu3v6VEVH -s --subtitle-format srt --json > "$CACHE/bili_sub.json"

# 评论（判断口碑）
PYTHONIOENCODING=utf-8 bili video BV1bu3v6VEVH -c --json > "$CACHE/bili_comments.json"

# UP 主资料与视频列表
PYTHONIOENCODING=utf-8 bili user 475013101 --json > "$CACHE/bili_user.json"
PYTHONIOENCODING=utf-8 bili user-videos 475013101 -n 10 --json > "$CACHE/bili_user_videos.json"
```

返回结构：`{"ok": true, "data": {...}}`；搜索的 `data` 是数组，元素含 `bvid/title/author/play/duration`。
**先看 `ok` 再解析**；`data[].bvid` 为空说明该条是广告/合集占位，跳过。

没有字幕时：`bili audio <BV> --no-split -o "$CACHE/audio"` 下载音频，再
`agent-reach transcribe "$CACHE/audio/<file>.m4a" -o "$CACHE/bili_asr.txt"`（需要 Groq/OpenAI key）。

## B站：opencli（需桥，作为补充）

```bash
opencli bilibili search "AI Agent" --type video --limit 10 -f yaml
opencli bilibili subtitle BV1bu3v6VEVH -f yaml
opencli bilibili comments BV1bu3v6VEVH --limit 20 -f yaml
```

`bili` 不可用或需要登录态内容时才用；`download` 属于写文件，非必要不调用。

---

## YouTube

```bash
# 搜索 + 元数据
opencli youtube search "agent memory" --limit 10 -f yaml
opencli youtube video "https://www.youtube.com/watch?v=XXXX" -f yaml

# 字幕（首选）
opencli youtube transcript "https://www.youtube.com/watch?v=XXXX" --lang en --mode grouped -f yaml

# 无桥兜底：yt-dlp 抓字幕
yt-dlp --write-sub --write-auto-sub --sub-lang "en.*,zh.*" --skip-download \
  -o "$CACHE/%(id)s" "https://www.youtube.com/watch?v=XXXX"
```

`--mode grouped` 输出成段可读文本，`raw` 保留逐句时间戳。没有字幕时用 `yt-dlp -x --audio-format mp3` 再走转录。

## 播客 / 音频 / 任意视频转录

```bash
agent-reach transcribe "<URL 或本地文件>" -o "$CACHE/transcript.txt"
# 可选：--provider groq|openai
```

## 提取模板

```text
BV号/URL | 标题 | UP主 | 播放量 | 发布时间 | 字幕要点 3–5 条 | 评论区争议点 | 可信度（一手实测/二手转述）
```

报告里 H1 写 `bilibili`（或 `youtube`），H2 放“查询与参数 / 结果”，H3 放单个视频。
**字幕是引用来源**：写结论时注明「据 BV1xxxx 字幕 12:30」，不要只写“B站上说”。

#!/usr/bin/env bash
# ResearchKit — 安装到 agent 技能目录（macOS / Linux，符号链接）
#
# 用法:
#   bash ./scripts/install.sh
#   bash ./scripts/install.sh --dest ~/.claude/skills/researchkit
#   bash ./scripts/install.sh --out-dir ~/Notes/research
#   bash ./scripts/install.sh --force        # 覆盖已存在的实体目录
set -euo pipefail

DEST="$HOME/.agents/skills/researchkit"
OUT_DIR=""
FORCE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --dest) DEST="$2"; shift 2 ;;
    --out-dir) OUT_DIR="$2"; shift 2 ;;
    --force) FORCE=1; shift ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$SRC" = "$DEST" ]; then
  echo "源目录与目标目录相同: $DEST" >&2
  exit 2
fi

mkdir -p "$(dirname "$DEST")"

if [ -e "$DEST" ] || [ -L "$DEST" ]; then
  if [ -L "$DEST" ] || [ "$FORCE" -eq 1 ]; then
    rm -rf "$DEST"
    echo "removed existing: $DEST"
  else
    echo "$DEST 已存在且不是链接。请先手动移走，或加 --force 覆盖。" >&2
    exit 1
  fi
fi

ln -s "$SRC" "$DEST"
echo "linked: $DEST -> $SRC"

if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
  printf '{\n  "outDir": "%s"\n}\n' "$OUT_DIR" > "$SRC/config.json"
  echo "config: $SRC/config.json (outDir = $OUT_DIR)"
fi

echo
echo "验证: node \"$SRC/scripts/probe.mjs\" --table"
echo "在 agent 里说：调研一下 <主题>"

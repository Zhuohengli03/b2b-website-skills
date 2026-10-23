#!/usr/bin/env bash
# 把本仓库的 11 个 skill 装进 OpenClaw / Claude Code / Codex 的 skills 目录。
# 用法：bash install.sh openclaw | claude | codex | all
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
copy_to() {
  local dest="$1"; mkdir -p "$dest"
  for d in "$HERE"/skills/*/; do
    local n; n="$(basename "$d")"
    rm -rf "$dest/$n"; cp -R "$d" "$dest/$n"
  done
  # 共同规则随 b2b-run 一起放，skill 里按文件名引用
  cp "$HERE"/README-流水线总览.md "$HERE"/职责归属矩阵.md "$HERE"/文件契约.md "$dest/b2b-run/"
  echo "已安装到 $dest（$(ls "$dest" | grep -c '^b2b-') 个 skill）"
}
target="${1:-all}"
case "$target" in
  openclaw) copy_to "${OPENCLAW_SKILLS:-$HOME/.openclaw/workspace/skills}"; echo "然后执行：openclaw gateway restart" ;;
  claude)   copy_to "${CLAUDE_SKILLS:-$HOME/.claude/skills}" ;;
  codex)    copy_to "${CODEX_SKILLS:-$HOME/.codex/skills}" ;;
  all)      "$0" openclaw; "$0" claude; "$0" codex ;;
  *) echo "用法：bash install.sh openclaw | claude | codex | all"; exit 1 ;;
esac

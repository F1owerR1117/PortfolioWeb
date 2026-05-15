#!/bin/bash
# ============================================================
# snapshot.sh — 创建项目快照（自动备份）
# 用法: bash scripts/snapshot.sh ["可选备注信息"]
# ============================================================
set -e

cd "$(dirname "$0")/.."  # 切换到项目根目录

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
HASH=$(git rev-parse --short HEAD 2>/dev/null || echo "none")
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

# 检查是否有变更
CHANGED=$(git status --porcelain 2>/dev/null | wc -l)
if [ "$CHANGED" -eq 0 ]; then
    echo "✔ 工作区干净，无需快照 (当前 commit: $HASH)"
    exit 0
fi

# 拼接提交信息
MSG="snapshot: $TIMESTAMP"
if [ -n "$1" ]; then
    MSG="$MSG — $1"
fi

# 添加所有变更（包括新文件），排除 .gitignore 规则
git add -A

# 创建快照提交
git commit -m "$MSG"

NEW_HASH=$(git rev-parse --short HEAD)
echo ""
echo "============================================"
echo " ✅ 快照已创建"
echo "    时间: $TIMESTAMP"
echo "    分支: $BRANCH"
echo "    提交: $NEW_HASH"
echo "    备注: ${1:-（无）}"
echo "============================================"
echo ""
echo "变更文件统计:"
git show --stat --name-only HEAD | tail -n +7 | head -n -1 | sed 's/^/  /'

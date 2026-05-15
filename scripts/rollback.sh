#!/bin/bash
# ============================================================
# rollback.sh — 回滚到之前的快照
# 用法:
#   bash scripts/rollback.sh              # 交互模式
#   bash scripts/rollback.sh list         # 列出所有快照
#   bash scripts/rollback.sh <commit-hash> # 回滚到指定快照
#   bash scripts/rollback.sh undo         # 撤销上一次回滚
# ============================================================
set -e

cd "$(dirname "$0")/.."  # 切换到项目根目录

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}  项目快照回滚工具${NC}"
echo -e "${CYAN}============================================${NC}"
echo ""

# --- 辅助函数 ---
list_snapshots() {
    echo -e "${YELLOW}最近快照列表:${NC}"
    echo ""
    git log --oneline --all -30 --grep="^snapshot:" 2>/dev/null || echo "  （没有找到快照记录）"
    echo ""
    echo -e "${YELLOW}所有提交历史（最近10条）:${NC}"
    echo ""
    git log --oneline --all -10
    echo ""
}

# --- 列出模式 ---
if [ "$1" = "list" ]; then
    list_snapshots
    exit 0
fi

# --- 撤销模式 ---
if [ "$1" = "undo" ]; then
    echo -e "${YELLOW}正在撤销上一次回滚...${NC}"
    git reflog -1 | head -1
    echo ""
    echo -e "${RED}这会将 HEAD 重置到上一个位置。继续? (y/n)${NC}"
    read -r CONFIRM
    if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
        git reset --soft HEAD@{1}
        echo -e "${GREEN}✔ 已撤销。变更保留在工作区，可重新提交或丢弃。${NC}"
    else
        echo "已取消"
    fi
    exit 0
fi

# --- 指定 commit 回滚 ---
if [ -n "$1" ]; then
    COMMIT="$1"
    # 检查 commit 是否存在
    if ! git cat-file -e "$COMMIT" 2>/dev/null; then
        echo -e "${RED}✘ 错误: commit '$COMMIT' 不存在${NC}"
        exit 1
    fi

    echo -e "${YELLOW}即将回滚到:${NC}"
    git log --oneline -1 "$COMMIT"
    echo ""
    echo -e "${RED}⚠ 警告: 这将把工作区文件恢复到快照状态，当前未提交的变更将丢失!${NC}"
    echo -e "${RED}   建议先运行 bash scripts/snapshot.sh 保存当前进度${NC}"
    echo ""
    echo -e "选项:"
    echo "  1) 硬回滚 — 丢弃所有未提交变更 (git reset --hard)"
    echo "  2) 软回滚 — 保留当前变更为未暂存状态 (git reset --soft)"
    echo "  3) 仅查看 — 查看该快照与当前的区别"
    echo "  4) 取消"
    echo ""
    echo -n "请选择 [1-4]: "
    read -r CHOICE

    case "$CHOICE" in
        1)
            echo -e "${RED}再次确认: 硬回滚会丢失所有未提交变更! 输入 'yes' 确认:${NC}"
            read -r CONFIRM
            if [ "$CONFIRM" = "yes" ]; then
                git reset --hard "$COMMIT"
                echo -e "${GREEN}✔ 已硬回滚到 $COMMIT${NC}"
            else
                echo "已取消"
            fi
            ;;
        2)
            git reset --soft "$COMMIT"
            echo -e "${GREEN}✔ 已软回滚到 $COMMIT，变更保留在工作区${NC}"
            ;;
        3)
            git diff "$COMMIT" HEAD --stat
            echo ""
            echo -e "输入文件路径可查看详细差异，直接回车跳过:"
            read -r FILEPATH
            if [ -n "$FILEPATH" ]; then
                git diff "$COMMIT" HEAD -- "$FILEPATH"
            fi
            ;;
        *)
            echo "已取消"
            ;;
    esac
    exit 0
fi

# --- 交互模式 ---
while true; do
    echo ""
    echo -e "${CYAN}可用操作:${NC}"
    echo "  1) 列出所有快照"
    echo "  2) 回滚到指定快照"
    echo "  3) 从快照恢复单个文件"
    echo "  q) 退出"
    echo ""
    echo -n "请选择 [1-3/q]: "
    read -r CMD

    case "$CMD" in
        1)
            list_snapshots
            ;;
        2)
            echo -n "输入要回滚到的 commit hash: "
            read -r HASH
            if [ -n "$HASH" ]; then
                bash "$0" "$HASH"
            fi
            ;;
        3)
            echo -n "输入 commit hash (快照): "
            read -r HASH
            if [ -n "$HASH" ]; then
                echo -n "输入要恢复的文件路径 (例如 public/js/components.js): "
                read -r FILE
                if [ -n "$FILE" ]; then
                    if git show "$HASH:$FILE" > /dev/null 2>&1; then
                        echo -e "${RED}确认恢复 '$FILE' 到快照版本? (y/n)${NC}"
                        read -r CONFIRM
                        if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
                            git checkout "$HASH" -- "$FILE"
                            echo -e "${GREEN}✔ 文件 '$FILE' 已恢复到快照版本${NC}"
                        fi
                    else
                        echo -e "${RED}✘ 该快照中不存在文件 '$FILE'${NC}"
                    fi
                fi
            fi
            ;;
        q|Q)
            echo "退出"
            exit 0
            ;;
        *)
            echo -e "${RED}无效选项${NC}"
            ;;
    esac
done

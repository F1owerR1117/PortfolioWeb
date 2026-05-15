@echo off
REM ============================================
REM snapshot.bat — Windows 快捷方式
REM 用法: 双击运行，或在命令行加备注
REM        snapshot.bat "修复了评论bug"
REM ============================================
bash scripts/snapshot.sh %1
if %errorlevel% neq 0 (
    echo 运行失败，请确保在 Git Bash 环境中执行
    pause
)

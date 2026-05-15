@echo off
REM ============================================
REM rollback.bat — Windows 快捷方式
REM 用法: 双击进入交互模式
REM       rollback.bat list    查看快照
REM       rollback.bat <hash>  回滚到指定版本
REM ============================================
bash scripts/rollback.sh %1
if %errorlevel% neq 0 (
    echo 运行失败，请确保在 Git Bash 环境中执行
    pause
)

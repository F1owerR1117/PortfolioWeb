@echo off
REM ============================================
REM snapshot.bat — Windows 快捷方式
REM 用法: 双击运行，或在命令行加备注
REM        snapshot.bat "修复了评论bug"
REM ============================================

REM 检查 bash 是否可用
where bash >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到 bash，请确保安装了 Git Bash
    pause
    exit /b 1
)

echo. & echo 正在创建快照...
CALL bash scripts/snapshot.sh %1
echo. & echo ----------------------------------------
echo 快照操作完成，按任意键关闭窗口
pause

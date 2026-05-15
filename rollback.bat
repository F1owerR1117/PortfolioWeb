@echo off
REM ============================================
REM rollback.bat — Windows 快捷方式
REM 用法: 双击进入交互模式
REM       rollback.bat list    查看快照
REM       rollback.bat <hash>  回滚到指定版本
REM ============================================

REM 检查 bash 是否可用
where bash >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到 bash，请确保安装了 Git Bash
    echo 下载: https://git-scm.com/downloads
    pause
    exit /b 1
)

REM 使用交互模式运行，完成后暂停
echo. & echo 正在启动回滚工具...
echo. & echo 提示: 选择操作后按 Enter 确认
echo. & echo ----------------------------------------
CALL bash scripts/rollback.sh %1
echo. & echo ----------------------------------------
echo 脚本已退出，按任意键关闭窗口
pause

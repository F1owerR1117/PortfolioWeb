@echo off
REM 关闭运行在 3000 端口的服务器进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTEN"') do (
  taskkill /f /pid %%a >nul 2>&1
)
echo 服务器已关闭

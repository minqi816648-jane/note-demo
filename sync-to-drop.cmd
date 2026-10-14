@echo off
REM 一键同步备份到 drop 目录
REM 将项目当前「变更文件」复制到 drop（跳过 node_modules/缓存/编译产物）
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0sync-to-drop.ps1"
endlocal

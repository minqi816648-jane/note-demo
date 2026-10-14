@echo off
REM note-demo 快速启动脚本
REM 用法：
REM   start-fast.cmd         正常启动（优先复用缓存，最快）
REM   start-fast.cmd clean   干净启动（清缓存后全量打包，最稳定，但慢）

setlocal
cd /d "%~dp0"

REM 提升 Node 内存，避免大项目 bundle 卡死/溢出
set NODE_OPTIONS=--max-old-space-size=4096

REM 允许使用 Metro 持久缓存（正式版默认已启用）
set EXPO_USE_METRO_WORKSPACE_ROOT=1

if /i "%~1"=="clean" (
    echo [note-demo] 正在清除 Metro 缓存并干净启动...
    if exist ".expo" rd /s /q ".expo"
) else (
    echo [note-demo] 启动中（复用缓存，较第一次快）...
)

echo.
echo 提示：若仍很慢，请把整个项目目录加入 Windows 安全中心排除项。
echo      见 README / 之前说明，排除 node_modules（3.6万文件）提速最明显。
echo.

call "node_modules\.bin\expo.cmd" start
endlocal

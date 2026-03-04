@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

REM 解决中文输出乱码
chcp 65001 >nul
set PYTHONIOENCODING=utf-8

set "SCRIPT=open-build.py"
set "EXE_NAME=open-build.exe"

if not exist "%SCRIPT%" (
  echo 未找到 %SCRIPT% ，请确认文件在当前目录。
  pause
  exit /b 1
)

echo 检查 PyInstaller...
where pyinstaller >nul 2>nul
if errorlevel 1 (
  echo 未检测到 PyInstaller，正在尝试安裝...
  python -m pip install --upgrade pyinstaller || (
    echo PyInstaller 安装失败，请手动安装后重试。
    pause
    exit /b 1
  )
)

echo 正在打包为 EXE...
pyinstaller --noconfirm --onefile --console "%SCRIPT%"
if errorlevel 1 (
  echo 打包失败。
  pause
  exit /b 1
)

echo.
echo 打包完成：dist\%EXE_NAME%
echo 开始清理打包残留文件...

rem 计算脚本基名以定位 .spec 文件
for %%I in ("%SCRIPT%") do set "BASENAME=%%~nI"
set "SPEC=%BASENAME%.spec"

rem 删除 build 目录（PyInstaller 生成的临时文件）
if exist "build" (
  echo 正在删除 build/ ...
  rmdir /s /q "build"
  if not exist "build" (echo 已删除 build/) else (echo 无法删除 build/)
)

rem 删除 __pycache__（若存在）
if exist "__pycache__" (
  echo 正在删除 __pycache__ ...
  rmdir /s /q "__pycache__"
  if not exist "__pycache__" (echo 已删除 __pycache__) else (echo 无法删除 __pycache__)
)

rem 删除 .spec 文件
if exist "%SPEC%" (
  echo 正在删除 %SPEC% ...
  del /f /q "%SPEC%"
  if not exist "%SPEC%" (echo 已删除 %SPEC%) else (echo 无法删除 %SPEC%)
)

echo 清理完成。如需保留构建产物，请手动恢复对应文件。
pause
endlocal

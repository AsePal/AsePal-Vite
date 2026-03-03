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

echo 正在打包為單文件 EXE...
pyinstaller --noconfirm --onefile --console "%SCRIPT%"
if errorlevel 1 (
  echo 打包失败。
  pause
  exit /b 1
)

echo.
echo 打包完成：dist\%EXE_NAME%
echo 如需重新打包，可刪除 build/ 和 dist/ 再运行本脚本。
pause
endlocal

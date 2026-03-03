@echo off
setlocal
cd /d "%~dp0"

REM 解决中文输出乱码
chcp 65001 >nul
set PYTHONIOENCODING=utf-8

set "EXE_PATH=dist\open-build.exe"
set "SCRIPT=open-build.py"

if exist "%EXE_PATH%" (
  echo 检测到已打包的 EXE，优先运行...
  "%EXE_PATH%"
) else (
  echo 未找到 %EXE_PATH%，直接使用 Python 运行脚本...
  python "%SCRIPT%"
)

endlocal

@echo off
chcp 65001 >nul
echo ============================================
echo   AsePal 自动化测试运行器 - 打包脚本
echo ============================================
echo.

REM 检查 Python 是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Python，请先安装 Python 3.8+
    pause
    exit /b 1
)

echo ✓ 检测到 Python
echo.

REM 检查并安装 pyinstaller
echo 正在检查 pyinstaller...
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo 正在安装 pyinstaller...
    pip install pyinstaller
)

echo.
echo 开始打包 test_runner.py 为 EXE...
echo.

REM 使用 pyinstaller 打包
pyinstaller --onefile --console --name "测试运行器" --distpath "." test_runner.py

if errorlevel 1 (
    echo.
    echo ❌ 打包失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo ============================================
echo ✓ 打包完成！
echo.
echo 生成的文件: 测试运行器.exe
echo 请将此 EXE 文件放在项目根目录运行
echo ============================================
echo.

REM 清理临时文件
echo 正在清理临时文件...
rmdir /s /q build 2>nul
rmdir /s /q __pycache__ 2>nul
del /f /q test_runner.spec 2>nul

echo ✓ 清理完成
echo.
pause

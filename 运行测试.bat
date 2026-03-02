@echo off
chcp 65001 >nul
echo ============================================
echo   直接运行 Python 测试脚本
echo ============================================
echo.
echo 注意: 此脚本会自动启动开发服务器 (pnpm dev)
echo       然后执行自动化测试
echo.

python test_runner.py

echo.
pause

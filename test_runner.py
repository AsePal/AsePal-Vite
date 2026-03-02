#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
自动化测试运行器
用于演示 Playwright 自动化测试的执行流程
可打包为 EXE 文件在项目根目录执行

功能：
- 首先启动开发服务器 pnpm dev
- 首次执行有问题的自动化测试（退出登录按钮出错）
- 测试结束后自动打开测试报告
- 提供菜单选择重新执行或执行正常测试
"""

import os
import sys
import subprocess
import time
import webbrowser
import signal
import atexit
from pathlib import Path
import urllib.request
import urllib.error


# 全局变量存储开发服务器进程
dev_server_process = None

# 颜色常量（ANSI）
CYAN = "\x1b[36m"
GREEN = "\x1b[32m"
YELLOW = "\x1b[33m"
RED = "\x1b[31m"
RESET = "\x1b[0m"


def get_project_root():
    """获取项目根目录"""
    # 如果是打包后的 EXE，使用 EXE 所在目录
    if getattr(sys, 'frozen', False):
        return Path(sys.executable).parent
    # 否则使用脚本所在目录
    return Path(__file__).parent


def clear_console():
    """清空控制台"""
    os.system('cls' if os.name == 'nt' else 'clear')


def print_banner():
    """打印横幅"""
    print("=" * 60)
    print("       Playwright 自动化测试运行器 v1.0")
    print("=" * 60)
    print()


def print_menu():
    """打印菜单"""
    print("\n" + "-" * 40)
    print("请选择操作：")
    # 带颜色的选项：1=cyan, 2=green, 3=red
    print(f"  {CYAN}[1]{RESET} {GREEN}重试当前测试{RESET}")
    print(f"  {CYAN}[2]{RESET} {YELLOW}重启playwright服务后重试测试{RESET}")
    print(f"  {CYAN}[3]{RESET} {RED}退出程序{RESET}")
    print("-" * 40)
    sys.stdout.flush()


def open_report(project_root):
    """打开测试报告"""
    report_path = project_root / "playwright-report" / "index.html"
    
    if report_path.exists():
        print(f"\n📊 正在打开测试报告: {report_path}")
        sys.stdout.flush()
        # 使用系统默认浏览器打开
        if os.name == 'nt':
            os.startfile(str(report_path))
        else:
            webbrowser.open(f"file://{report_path}")
        return True
    else:
        print(f"\n⚠️ 未找到测试报告文件: {report_path}")
        return False


def start_dev_server(project_root):
    """启动开发服务器（完全静默后台运行）"""
    global dev_server_process
    
    print("🚀 正在启动开发服务器 (pnpm dev)...")
    print("   请等待服务器启动完成...")
    sys.stdout.flush()
    
    # 启动开发服务器，将输出重定向到 DEVNULL（完全静默）
    if os.name == 'nt':
        # Windows - 使用 start /B 在后台运行
        dev_server_process = subprocess.Popen(
            "pnpm dev",
            shell=True,
            cwd=project_root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
    else:
        # Linux/Mac
        dev_server_process = subprocess.Popen(
            "pnpm dev",
            shell=True,
            cwd=project_root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            preexec_fn=os.setsid
        )
    
    # 等待服务器启动：轮询 localhost:5173，直到返回 HTTP 200 或超时
    print("   正在等待开发服务器可用 (http://localhost:5173) ...")
    sys.stdout.flush()
    start_time = time.time()
    timeout = 60  # 最长等待 60 秒
    url = 'http://localhost:5173/'
    while True:
        # 如果进程已退出，直接返回失败
        if dev_server_process.poll() is not None:
            print("\n⚠️ 开发服务器进程已退出，无法启动")
            sys.stdout.flush()
            break
        try:
            with urllib.request.urlopen(url, timeout=2) as resp:
                status = resp.getcode()
                if status and status < 400:
                    print("\n✅ 开发服务器已可用: http://localhost:5173")
                    sys.stdout.flush()
                    break
        except (urllib.error.URLError, Exception):
            # 仍在启动中，继续等待
            pass

        if time.time() - start_time > timeout:
            print(f"\n⚠️ 等待开发服务器超时 ({timeout}s)。继续执行，但可能无法访问 http://localhost:5173")
            sys.stdout.flush()
            break

        print('.', end='', flush=True)
        time.sleep(1)
    
    return dev_server_process


def stop_dev_server():
    """停止开发服务器"""
    global dev_server_process
    
    if dev_server_process:
        print("\n🛑 正在停止开发服务器...")
        sys.stdout.flush()
        try:
            if os.name == 'nt':
                # Windows: 使用 taskkill 强制终止进程树
                subprocess.run(
                    f"taskkill /F /T /PID {dev_server_process.pid}",
                    shell=True,
                    capture_output=True
                )
            else:
                # Linux/Mac: 发送 SIGTERM 到进程组
                os.killpg(os.getpgid(dev_server_process.pid), signal.SIGTERM)
            
            try:
                dev_server_process.wait(timeout=3)
            except:
                pass
            print("✅ 开发服务器已停止")
        except Exception as e:
            print(f"⚠️ 停止服务器时出现警告: {e}")
        finally:
            dev_server_process = None
        sys.stdout.flush()


def run_playwright_test(project_root, test_type):
    """
    运行 Playwright 测试
    test_type: 'broken' 或 'normal'
    """
    if test_type == 'broken':
        cmd = "pnpm run demo:playwright:broken"
        description = "重试当前测试"
    else:
        cmd = "pnpm run demo:playwright:normal"
        description = "重启playwright服务后重试测试"
    
    print(f"\n🚀 playwright已开始执行")
    print("-" * 50)
    print(f"执行命令: {cmd}\n")
    sys.stdout.flush()
    
    try:
        # 运行测试（阻塞等待完成）
        # 设置环境变量禁止 playwright 自动打开报告
        env = os.environ.copy()
        env['CI'] = 'true'  # 设置 CI 模式，避免交互式提示
        
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=project_root,
            env=env
        )
        
        print("\n" + "=" * 50)
        if result.returncode == 0:
            print("✅ 测试执行完成 - 全部通过")
        else:
            print(f"❌ 测试执行完成 - 存在失败 (返回码: {result.returncode})")
        print("=" * 50)
        sys.stdout.flush()
        
        return result.returncode
    except Exception as e:
        print(f"\n❌ 执行测试时出错: {e}")
        sys.stdout.flush()
        return -1


def check_pnpm():
    """检查 pnpm 是否安装"""
    try:
        result = subprocess.run(
            "pnpm --version",
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            print(f"✓ 检测到 pnpm 版本: {result.stdout.strip()}")
            return True
    except:
        pass
    
    print("❌ 错误: 未找到 pnpm，请先安装 pnpm")
    print("   安装命令: npm install -g pnpm")
    return False


def cleanup():
    """清理函数，确保退出时停止开发服务器"""
    stop_dev_server()


def signal_handler(signum, frame):
    """信号处理函数"""
    print("\n\n⚠️ 收到中断信号，正在清理...")
    cleanup()
    sys.exit(0)


def main():
    """主函数"""
    project_root = get_project_root()
    
    # 注册清理函数
    atexit.register(cleanup)
    
    # 注册信号处理（仅在非 Windows 或特定情况）
    try:
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    except:
        pass
    
    clear_console()
    print_banner()
    
    print(f"📂 项目目录: {project_root}")
    print()
    sys.stdout.flush()
    
    # 检查 pnpm
    if not check_pnpm():
        input("\n按 Enter 键退出...")
        return
    
    # 检查必要文件是否存在
    tests_dir = project_root / "tests"
    package_json = project_root / "package.json"
    
    if not tests_dir.exists():
        print(f"❌ 错误: 找不到 tests 目录: {tests_dir}")
        print("请确保在项目根目录运行此程序")
        input("\n按 Enter 键退出...")
        return
    
    if not package_json.exists():
        print(f"❌ 错误: 找不到 package.json: {package_json}")
        print("请确保在项目根目录运行此程序")
        input("\n按 Enter 键退出...")
        return
    
    try:
        # 启动开发服务器
        start_dev_server(project_root)
        
        # 首次执行有问题的测试
        print("🔄 自动化测试即将开始...\n")
        sys.stdout.flush()
        time.sleep(1)
        
        run_playwright_test(project_root, 'broken')
        
        # 自动打开测试报告
        time.sleep(1)
        open_report(project_root)
        
        # 进入菜单循环
        while True:
            print_menu()
            
            try:
                choice = input("\n请输入选项 (1/2/3): ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n\n👋 程序已退出")
                break
            
            if choice == '1':
                clear_console()
                print_banner()
                print("📡 开发服务器运行中 (http://localhost:5173)")
                sys.stdout.flush()
                run_playwright_test(project_root, 'broken')
                time.sleep(1)
                open_report(project_root)
                
            elif choice == '2':
                clear_console()
                print_banner()
                print("📡 开发服务器运行中 (http://localhost:5173)")
                sys.stdout.flush()
                run_playwright_test(project_root, 'normal')
                time.sleep(1)
                open_report(project_root)
                
            elif choice == '3':
                print("\n👋 感谢使用，再见！")
                break
            
            else:
                print("\n⚠️ 无效选项，请输入 1、2 或 3")
    
    except KeyboardInterrupt:
        print("\n\n👋 程序被中断")
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
    finally:
        # 确保退出时停止开发服务器
        cleanup()


if __name__ == "__main__":
    main()

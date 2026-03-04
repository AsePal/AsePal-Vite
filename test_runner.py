#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
自动化测试运行器
用于演示 Playwright 自动化测试的执行流程
可打包为 EXE 文件在项目根目录执行
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
import shutil


# 全局变量存储开发服务器进程
dev_server_process = None
INTERRUPTED_EXIT_CODE = 130
pnpm_executable = None

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
    print()
    print("       Playwright 自动化测试运行器 v1.0")
    print()
    print("=" * 60)
    print()


def print_menu():
    """打印菜单"""
    print("\n" + "-" * 40)
    print("请选择操作：")
    # 带颜色的选项
    print(f"  {CYAN}[1]{RESET} {GREEN}运行自动化测试{RESET}")
    print(f"  {CYAN}[2]{RESET} {YELLOW}重启playwright服务后重试测试{RESET}")
    print(f"  {CYAN}[3]{RESET} {CYAN}重启开发服务{RESET}")
    print(f"  {CYAN}[4]{RESET} {RED}退出程序{RESET}")
    print("-" * 40)
    sys.stdout.flush()


def set_console_topmost(enable):
    """在 Windows 下切换控制台窗口置顶状态"""
    if os.name != 'nt':
        return
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32
        user32 = ctypes.windll.user32

        # 64 位 Windows 下 HWND 是 64 位指针，必须设置 restype
        kernel32.GetConsoleWindow.restype = ctypes.c_void_p
        hwnd = kernel32.GetConsoleWindow()
        if not hwnd:
            return

        # 正确声明 SetWindowPos 参数类型，确保 HWND 指针大小正确
        user32.SetWindowPos.argtypes = [
            ctypes.c_void_p,  # hWnd
            ctypes.c_void_p,  # hWndInsertAfter
            ctypes.c_int,     # X
            ctypes.c_int,     # Y
            ctypes.c_int,     # cx
            ctypes.c_int,     # cy
            ctypes.c_uint,    # uFlags
        ]
        user32.SetWindowPos.restype = ctypes.c_bool

        HWND_TOPMOST = -1
        HWND_NOTOPMOST = -2
        SWP_NOMOVE = 0x0002
        SWP_NOSIZE = 0x0001
        SWP_NOACTIVATE = 0x0010

        insert_after = HWND_TOPMOST if enable else HWND_NOTOPMOST
        user32.SetWindowPos(
            hwnd,
            insert_after,
            0,
            0,
            0,
            0,
            SWP_NOMOVE | SWP_NOSIZE | SWP_NOACTIVATE,
        )
    except Exception:
        pass


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
    global pnpm_executable
    
    print("🚀 正在启动开发服务器 (pnpm dev)...")
    print("   请等待服务器启动完成...")
    sys.stdout.flush()
    
    # 启动开发服务器，将输出重定向到 DEVNULL（完全静默）
    if os.name == 'nt':
        # Windows
        pnpm_cmd = pnpm_executable or shutil.which("pnpm") or shutil.which("pnpm.cmd") or "pnpm"
        dev_server_process = subprocess.Popen(
            [pnpm_cmd, "dev"],
            shell=False,
            cwd=project_root,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            stdin=subprocess.DEVNULL,
            creationflags=subprocess.CREATE_NEW_PROCESS_GROUP
        )
    else:
        # Linux/Mac
        pnpm_cmd = pnpm_executable or shutil.which("pnpm") or "pnpm"
        dev_server_process = subprocess.Popen(
            [pnpm_cmd, "dev"],
            shell=False,
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
    global pnpm_executable
    pnpm_cmd = pnpm_executable or shutil.which("pnpm") or shutil.which("pnpm.cmd") or "pnpm"

    if test_type == 'broken':
        cmd_args = [pnpm_cmd, "run", "demo:playwright:broken"]
    else:
        cmd_args = [pnpm_cmd, "run", "demo:playwright:normal"]
    
    print(f"\n🚀 playwright已开始执行")
    print("-" * 50)
    print(f"执行命令: {' '.join(cmd_args)}\n")
    sys.stdout.flush()
    
    try:
        # 设置环境变量禁止 playwright 自动打开报告
        env = os.environ.copy()
        env['CI'] = 'true'  # 设置 CI 模式，避免交互式提示

        # 测试执行期间置顶窗口
        set_console_topmost(True)

        # Windows: CREATE_NEW_PROCESS_GROUP 使子进程不接收 Ctrl+C 信号
        # stdin=DEVNULL 防止 cmd.exe 弹出 "Terminate batch job" 提示
        creation_flags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == 'nt' else 0
        process = subprocess.Popen(
            cmd_args,
            cwd=project_root,
            env=env,
            stdin=subprocess.DEVNULL,
            creationflags=creation_flags,
        )
        try:
            # 不使用 process.wait()，因为在 Windows 上它不可被 KeyboardInterrupt 打断
            # 改用轮询，每 0.2 秒检查一次进程状态，使 Ctrl+C 能够被捕获
            return_code = process.poll()
            while return_code is None:
                time.sleep(0.2)
                return_code = process.poll()
        except KeyboardInterrupt:
            # Ctrl+C 只会到达 Python 进程，子进程不会收到
            print("\n\n⚠️ 检测到用户中断，正在停止当前自动化测试...")
            sys.stdout.flush()

            # 强制终止子进程树
            try:
                if os.name == 'nt':
                    subprocess.run(
                        f"taskkill /F /T /PID {process.pid}",
                        shell=True,
                        capture_output=True
                    )
                else:
                    process.terminate()
            except Exception:
                pass

            try:
                process.wait(timeout=5)
            except Exception:
                try:
                    process.kill()
                except Exception:
                    pass

            # 恢复窗口状态
            set_console_topmost(False)
            print("↩️ 已中断当前测试，返回菜单")
            sys.stdout.flush()
            return INTERRUPTED_EXIT_CODE
        finally:
            # 测试结束后恢复窗口默认状态
            set_console_topmost(False)
        
        print("\n" + "=" * 50)
        if return_code == 0:
            print("✅ 测试执行完成 - 全部通过")
        else:
            print(f"❌ 测试执行完成 - 存在失败 (返回码: {return_code})")
        print("=" * 50)
        sys.stdout.flush()
        
        return return_code
    except Exception as e:
        set_console_topmost(False)
        print(f"\n❌ 执行测试时出错: {e}")
        sys.stdout.flush()
        return -1


def check_pnpm():
    """检查 pnpm 是否安装"""
    global pnpm_executable

    # 优先使用真实可执行路径，避免 Windows 下 shell=False 找不到 pnpm.cmd
    pnpm_executable = shutil.which("pnpm") or shutil.which("pnpm.cmd")

    if pnpm_executable:
        try:
            result = subprocess.run(
                [pnpm_executable, "--version"],
                shell=False,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print(f"✓ 检测到 pnpm 版本: {result.stdout.strip()}")
                return True
        except Exception:
            pass

    # 兜底：使用 shell 检测，兼容极端 PATH 场景
    try:
        result = subprocess.run(
            "pnpm --version",
            shell=True,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            if not pnpm_executable:
                pnpm_executable = "pnpm"
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
    
    # 注册信号处理：仅处理 SIGTERM，SIGINT 保留默认行为用于 Ctrl+C 局部捕获
    try:
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

        # 直接进入菜单（启动后不自动跑测试）
        clear_console()
        print_banner()
        print("📡 开发服务器运行中 (http://localhost:5173)")
        print()
        print("🧭 已进入操作菜单")
        sys.stdout.flush()
        
        # 进入菜单循环
        while True:
            print_menu()
            
            try:
                choice = input("\n请输入选项 (1/2/3/4): ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n\n👋 程序已退出")
                break
            
            if choice == '1':
                clear_console()
                print_banner()
                print("📡 开发服务器运行中 (http://localhost:5173)")
                sys.stdout.flush()
                result_code = run_playwright_test(project_root, 'broken')
                if result_code == INTERRUPTED_EXIT_CODE:
                    clear_console()
                    print_banner()
                    print("📡 开发服务器运行中 (http://localhost:5173)")
                    print()
                    print("🧭 测试异常退出！已返回操作菜单")
                    sys.stdout.flush()
                    continue
                time.sleep(1)
                open_report(project_root)
                
            elif choice == '2':
                clear_console()
                print_banner()
                print("📡 开发服务器运行中 (http://localhost:5173)")
                sys.stdout.flush()
                result_code = run_playwright_test(project_root, 'normal')
                if result_code == INTERRUPTED_EXIT_CODE:
                    clear_console()
                    print_banner()
                    print("📡 开发服务器运行中 (http://localhost:5173)")
                    print()
                    print("🧭 测试异常退出！已返回操作菜单")
                    sys.stdout.flush()
                    continue
                time.sleep(1)
                open_report(project_root)
                
            elif choice == '3':
                clear_console()
                print_banner()
                print("🔄 正在重启开发服务...")
                sys.stdout.flush()
                stop_dev_server()
                start_dev_server(project_root)
                clear_console()
                print_banner()
                print("📡 开发服务器运行中 (http://localhost:5173)")
                print("🧭 已进入操作菜单")
                sys.stdout.flush()
            
            elif choice == '4':
                print("\n👋 感谢使用，再见！")
                break
            
            else:
                print("\n⚠️ 无效选项，请输入 1、2、3 或 4")
    
    except KeyboardInterrupt:
        print("\n\n👋 程序被中断")
    except Exception as e:
        print(f"\n❌ 发生错误: {e}")
    finally:
        # 确保退出时停止开发服务器
        cleanup()


if __name__ == "__main__":
    main()

"""
Console-based fake build driver for the landing page generator.

Flow:
1. Show a banner with title, version, and stack info.
2. Prompt the user to drag-and-drop an API doc file (.md/.txt/.doc) into the window.
3. After detecting a valid file, simulate a quick "识别" pause.
4. Kick off the existing scripted build: `pnpm run open:build`.
5. Report completion and wait for a key press to exit.
"""

from __future__ import annotations

import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional
import shutil

try:
	# 确保控制台输出为 UTF-8，避免中文乱码
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8")
	if hasattr(sys.stderr, "reconfigure"):
		sys.stderr.reconfigure(encoding="utf-8")
except Exception:
	pass


TITLE = "H5登录页快速构建器"
VERSION = "v1.0"
STACK = "vite + react + tailwind"
ALLOWED_EXTS = {".md", ".txt", ".doc"}

# ANSI colors (Windows 10+ cmd 支持；若不支持会降级)
RESET = "\x1b[0m"
BOLD = "\x1b[1m"
CYAN = "\x1b[36m"
GREEN = "\x1b[32m"
YELLOW = "\x1b[33m"
MAGENTA = "\x1b[35m"


def _display_width(text: str) -> int:
	"""Approximate console cell width, counting CJK as double-width.

	Avoids misaligned box drawing when mixing中文+ASCII in cmd.
	"""
	import unicodedata

	width = 0
	for ch in text:
		# Wide/Fullwidth count as 2 cells, others as 1
		width += 2 if unicodedata.east_asian_width(ch) in {"W", "F"} else 1
	return width


def print_box(title: str, lines: list[str]) -> None:
	padding = 2
	content_lines = [title] + lines
	# Use display width so中文不会撑破框线
	width = max(_display_width(line) for line in content_lines) + padding * 2
	top = "┌" + "─" * width + "┐"
	bottom = "└" + "─" * width + "┘"

	print("\n" + top)
	for line in content_lines:
		display = _display_width(line)
		space = width - display
		left = space // 2
		right = space - left
		print("│" + " " * left + line + " " * right + "│")
	print(bottom + "\n")


def _choose_file_dialog() -> Optional[Path]:
	try:
		import tkinter as tk
		from tkinter import filedialog

		root = tk.Tk()
		root.withdraw()
		file_path = filedialog.askopenfilename(
			title="请选择接口文档 (.md/.txt/.doc)",
			filetypes=[("文档", "*.md *.txt *.doc"), ("所有文件", "*.*")],
		)
		root.destroy()
		if not file_path:
			return None
		return Path(file_path)
	except Exception:
		return None


def prompt_for_file() -> Path:
	print(f"{BOLD}{CYAN}请选择接口文档（支持 .md / .txt / .doc）{RESET}")
	print("-" * 61)
	print(f"{BOLD}提示：{RESET}")
	print()
	print(f"{CYAN}1){RESET} 即将自动弹出文件选择窗口，请选择文件；")
	print()
	print(f"{CYAN}2){RESET} 若弹窗未出现，可直接在下方输入文件完整路径。")
	print()
	print(f'{CYAN}3){RESET} 按下"Ctrl+K"键，进入页面风格设置菜单')
	print("-" * 61)
	print()

	# 首次自动弹出文件选择框
	print(f"{CYAN}正在打开文件选择窗口...{RESET}")
	selected = _choose_file_dialog()
	if selected and selected.is_file():
		ext = selected.suffix.lower()
		if ext in ALLOWED_EXTS:
			return selected
		else:
			allowed = ", ".join(sorted(ALLOWED_EXTS))
			print(f"{YELLOW}文件格式不支持 ({ext})，仅支持: {allowed}。{RESET}\n")

	# 若弹窗取消或格式不对，回退到手动输入
	print(f"{YELLOW}未通过弹窗选择有效文件，请手动输入路径。{RESET}\n")

	while True:
		raw = input("请输入文件完整路径后按回车（或直接回车重新打开选择框）: ")
		# Drag-drop paths on Windows often come with surrounding quotes
		cleaned = raw.strip().strip('"').strip("'")
		# cmd 拖拽偶尔会在末尾追加空格或反斜杠，统一清理
		cleaned = cleaned.rstrip()  # 尾随空格
		if cleaned.endswith("\\") and len(cleaned) > 3:
			cleaned = cleaned.rstrip("\\")

		if not cleaned:
			selected = _choose_file_dialog()
			if not selected:
				print("未选择文件，请重试。")
				continue
			cleaned = str(selected)

		path = Path(cleaned)
		if not path.is_file():
			print(f"{YELLOW}未找到文件: {path}. 请确认路径并重试。{RESET}")
			continue

		ext = path.suffix.lower()
		if ext not in ALLOWED_EXTS:
			allowed = ", ".join(sorted(ALLOWED_EXTS))
			print(f"{YELLOW}文件格式不支持 ({ext})，仅支持: {allowed}。请重新选择文件。{RESET}\n")
			continue

		return path


def _resolve_pnpm_command() -> Optional[list[str]]:
	names = ["pnpm", "pnpm.cmd", "pnpm.exe"]
	for name in names:
		found = shutil.which(name)
		if found:
			return [found]

	# corepack 也可以调用 pnpm
	if shutil.which("corepack"):
		return ["corepack", "pnpm"]

	# 最后尝试 npm exec pnpm
	if shutil.which("npm"):
		return ["npm", "exec", "pnpm"]

	return None


def run_build() -> int:
	print(f"{BOLD}开始构建页面...{RESET}")
	base = _resolve_pnpm_command()
	if not base:
		print(f"{YELLOW}未找到 pnpm，请先安装 pnpm 或将其添加到 PATH（可尝试 corepack enable）。{RESET}")
		return 127

	cmd = base + ["run", "open:build"]
	print(f"执行命令: {CYAN}{' '.join(cmd)}{RESET}")
	try:
		# Stream output so the user can watch the scripted build animation.
		with subprocess.Popen(
			cmd,
			stdout=subprocess.PIPE,
			stderr=subprocess.STDOUT,
			text=True,
			encoding="utf-8",
			errors="replace",
		) as proc:
			assert proc.stdout is not None
			for line in proc.stdout:
				print(line.rstrip())
			proc.wait()
			return proc.returncode or 0
	except FileNotFoundError:
		print("未找到 pnpm，请先安装 pnpm 或将其添加到 PATH。")
		return 127
	except KeyboardInterrupt:
		print(f"\n{YELLOW}构建被中断。{RESET}")
		return 130

def wait_for_keypress(prompt: str = f"{MAGENTA}按任意键退出...{RESET}") -> None:
	try:
		import msvcrt  # type: ignore

		print("\n" + prompt)
		msvcrt.getch()
	except Exception:
		# Fallback to Enter if msvcrt is unavailable (e.g., non-Windows).
		input("\n" + prompt)


def main() -> None:
	print_box(
		TITLE,
		[f"版本：{VERSION}", f"项目框架：{STACK}"]
	)

	doc_path = prompt_for_file()
	print(f"检测到文件拖入：{CYAN}{doc_path}{RESET}")
	print(f"{BOLD}正在识别文件...{RESET}")
	time.sleep(1)

	exit_code = run_build()
	if exit_code == 0:
		print(f"\n{GREEN}页面构建已完成。{RESET}")
	else:
		print(f"\n{YELLOW}页面构建异常结束，遇到错误终止！（退出码 {exit_code}）。{RESET}")

	wait_for_keypress()


if __name__ == "__main__":
	try:
		main()
	except Exception as exc:  # safeguard to ensure we always pause before exit
		print(f"{YELLOW}出现错误：{exc}{RESET}")
		sys.exit(1)

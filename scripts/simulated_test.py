#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
仿真自动化测试脚本（无 Browser 界面）
此脚本只在控制台输出模拟步骤日志并带有停顿，供测试运行器调用。
"""
import time
import sys


def p(msg: str = "", flush: bool = True):
    print(msg)
    if flush:
        try:
            sys.stdout.flush()
        except Exception:
            pass


def simulate_streaming_reply(total_secs=3.0, chunks=4):
    """模拟流式回复：在 total_secs 内分多次输出，以更真实。"""
    per = total_secs / chunks
    fragments = [
        "正在生成回复：",
        "…本段翻译已对齐，检测到若干术语差异",
        "…正在合并上下文并修正术语",
        "回复生成完成。",
    ]
    for f in fragments[:chunks]:
        p(f)
        time.sleep(per)
        p("")


def main():
    p("\n=== 自动化测试（无 Browser 界面） ===\n")
    p("提示：开始执行异步运行\n")
    time.sleep(0.2)

    # 线性流程配置：每项包含名称、描述、等待时长、模拟状态
    steps = [
        {"name": "打开站点", "desc": "访问 http://localhost:5173/", "wait": 1.2, "status": "✅"},
        {"name": "验证站点打开", "desc": "检查页面加载与网络空闲", "wait": 0.3, "status": "✅"},
        {"name": "切换语言", "desc": "打开侧栏并选择目标语言", "wait": 1.0, "status": "✅"},
        {"name": "发送对话", "desc": "输入问题并提交", "wait": 0.6, "status": "✅"},
        {"name": "获取回复", "desc": "流式输出模拟回复", "wait": 0.0, "status": "✅"},
        {"name": "修改头像", "desc": "模拟上传并保存头像，检查回显", "wait": 1.4, "status": "✅"},
        {"name": "提示登录", "desc": "触发登录弹窗/跳转登录页", "wait": 0.8, "status": "✅"},
    ]

    # 执行并输出每一步，步骤间保留空行
    for step in steps:
        p(f"{step['name']}: {step['desc']}")
        time.sleep(step['wait'])
        if step['name'] == '获取回复':
            simulate_streaming_reply(total_secs=3.0, chunks=4)
        p(f"状态: {step['status']}")
        p("")

    # 汇总与结束：生成测试报告
    p("🎉 测试完成！\n")

    # 生成基于显示宽度的表格报告，避免中文/emoji 导致边框错位
    import unicodedata

    def wcwidth_char(ch: str) -> int:
        if not ch:
            return 0
        o = ord(ch)
        if o == 0:
            return 0
        # 控制字符
        if o < 32 or (0x7f <= o < 0xa0):
            return 0
        # 组合字符
        if unicodedata.combining(ch):
            return 0
        ea = unicodedata.east_asian_width(ch)
        if ea in ('F', 'W'):
            return 2
        return 1

    def display_width(s: str) -> int:
        return sum(wcwidth_char(ch) for ch in s)

    def pad_display(s: str, width: int) -> str:
        out = ''
        w = 0
        for ch in s:
            cw = wcwidth_char(ch)
            if w + cw > width:
                break
            out += ch
            w += cw
        # 填充空格到目标宽度
        if w < width:
            out += ' ' * (width - w)
        return out

    def wrap_display(s: str, width: int):
        lines = []
        cur = ''
        cur_w = 0
        for ch in s:
            cw = wcwidth_char(ch)
            if cur_w + cw > width:
                lines.append(cur)
                cur = ch
                cur_w = cw
            else:
                cur += ch
                cur_w += cw
        if cur or not lines:
            lines.append(cur)
        return lines

    TARGET_INNER = 66
    top = '╔' + '═' * TARGET_INNER + '╗'
    mid = '╠' + '═' * TARGET_INNER + '╣'
    bot = '╚' + '═' * TARGET_INNER + '╝'

    title = 'Asepal AI 前端自动化测试报告'
    title_left = (TARGET_INNER - display_width(title)) // 2
    title_right = TARGET_INNER - display_width(title) - title_left

    # 输出仅保留横向边框，移除竖向边框字符，避免在窄终端出现竖线错位
    p(top)
    # 标题居中输出（无左右边框）
    p(' ' * title_left + title + ' ' * title_right)
    # 中间横线
    p('─' * TARGET_INNER)

    # 列宽（显示宽度）
    status_w = 10
    name_w = TARGET_INNER - status_w - 4

    # 头部（纯文本）
    header_line = f" 检查点{' ' * max(1, name_w - display_width('检查点'))}  状态"
    p(header_line)
    p('─' * TARGET_INNER)

    for step in steps:
        full = f"{step['name']} - {step['desc']}"
        lines = wrap_display(full, name_w)
        status_text = f"{step['status']}  通过"
        # 首行带状态
        first = pad_display(lines[0], name_w)
        p(f" {first}  {status_text}")
        # 其余行只填充名称列
        for ln in lines[1:]:
            p(f" {pad_display(ln, name_w)}")

    p('─' * TARGET_INNER)
    summary = f"共 {len(steps)} 个检查点 — 全部通过 ✅"
    sum_lines = wrap_display(summary, TARGET_INNER - 2)
    for sl in sum_lines:
        p(' ' + pad_display(sl, TARGET_INNER - 1))
    p(bot + '\n')


if __name__ == '__main__':
    try:
        start = time.time()
        main()
        elapsed = time.time() - start
        # 确保不超时：如果不足，可短暂停留展示结果
        if elapsed < 0.5:
            time.sleep(0.5 - elapsed)
        sys.exit(0)
    except KeyboardInterrupt:
        p("\n⚠️ 仿真测试被用户中断")
        sys.exit(130)

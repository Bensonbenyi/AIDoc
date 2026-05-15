"""
Block 文本转换工具

将不同类型的 DocumentBlock 转换为可索引的纯文本。
用于 RAG 检索系统的文本索引和 BM25 关键词检索。
"""

from typing import Any


def convert_block_to_text(block_type: str, content: dict[str, Any] | None) -> str:
    """
    将 block 内容转换为可索引的纯文本

    Args:
        block_type: block 类型（后端格式，如 paragraph, heading_1 等）
        content: block 的 content 字段（JSON dict）

    Returns:
        可索引的纯文本字符串
    """
    if not content:
        return ""

    if block_type in ("paragraph", "heading_1", "heading_2", "heading_3"):
        return content.get("text", "")

    if block_type in ("bullet_list", "numbered_list"):
        items = content.get("items", [])
        return "\n".join(f"- {item}" for item in items if item)

    if block_type == "todo":
        text = content.get("text", "")
        checked = "已完成" if content.get("checked") else "未完成"
        return f"待办事项：{text}，状态：{checked}"

    if block_type == "table":
        headers = content.get("headers", [])
        rows = content.get("rows", [])
        parts = []
        if headers:
            parts.append("表格标题：" + " | ".join(str(h) for h in headers))
        for row in rows:
            parts.append(" | ".join(str(cell) for cell in row))
        return "\n".join(parts)

    if block_type == "quote":
        return f"引用：{content.get('text', '')}"

    if block_type == "divider":
        return ""  # 分隔线不索引

    if block_type == "code":
        code = content.get("code", "")
        output = content.get("output", "")
        text = f"Python 代码块：\n{code}"
        if output:
            text += f"\n运行结果：{output[:500]}"
        return text

    if block_type == "chart_3d":
        chart_type = content.get("chartType", "bar")
        title = content.get("title", "")
        text = f"3D 图表：{title}（类型：{chart_type}）"
        # 包含数据摘要
        x_data = content.get("xData", [])
        y_data = content.get("yData", [])
        if x_data:
            text += f"\nX 轴数据：{', '.join(str(d) for d in x_data[:10])}"
        if y_data:
            text += f"\nY 轴数据：{', '.join(str(d) for d in y_data[:10])}"
        return text

    if block_type == "whiteboard":
        # 白板无法做文本理解，返回标题或说明
        title = content.get("title", "白板")
        return f"白板：{title}"

    if block_type == "link_to_document":
        target_title = content.get("targetTitle", content.get("title", ""))
        target_path = content.get("targetPath", "")
        return f"文档链接：{target_title}\n路径：{target_path}"

    if block_type in ("image", "file"):
        file_name = content.get("fileName", content.get("name", ""))
        description = content.get("description", content.get("alt", ""))
        parts = [f"文件：{file_name}"]
        if description:
            parts.append(f"描述：{description}")
        return "\n".join(parts)

    if block_type == "audio":
        file_name = content.get("fileName", "")
        description = content.get("description", "")
        return f"音频：{file_name}\n描述：{description}"

    if block_type == "video":
        file_name = content.get("fileName", "")
        description = content.get("description", "")
        return f"视频：{file_name}\n描述：{description}"

    if block_type == "ai_answer":
        return content.get("text", content.get("answer", ""))

    # 未知类型，尝试返回 text 字段
    return content.get("text", "")


def convert_block_to_bm25_text(block_type: str, content: dict[str, Any] | None) -> str:
    """
    将 block 内容转换为适合 BM25 关键词检索的文本

    与 convert_block_to_text 类似，但去除格式标记，更适合关键词匹配。

    Args:
        block_type: block 类型
        content: block 的 content 字段

    Returns:
        适合关键词检索的纯文本
    """
    text = convert_block_to_text(block_type, content)

    # 去除 Markdown 格式标记
    # 去除代码块标记
    text = text.replace("```", "")
    # 去除引用标记
    text = text.replace("> ", "")
    # 去除列表标记
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        line = line.strip()
        if line.startswith("- "):
            line = line[2:]
        if line:
            cleaned_lines.append(line)

    return "\n".join(cleaned_lines)

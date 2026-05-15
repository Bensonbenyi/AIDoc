"""
文本切片工具

实现长文本的切片功能，用于 RAG 系统的文本索引。
按段落优先切分，保留完整句子，支持重叠区域。
"""

import re


def split_text(
    text: str,
    max_chunk_size: int = 500,
    overlap: int = 50,
) -> list[str]:
    """
    将长文本切分为多个 chunk

    切分策略：
    1. 按段落（双换行）切分
    2. 如果单个段落超过 max_chunk_size，按句子切分
    3. 每个 chunk 保留 overlap 个字符的重叠区域
    4. 保留完整句子，不在句子中间断开

    Args:
        text: 待切分的文本
        max_chunk_size: 每个 chunk 的最大字符数（默认 500）
        overlap: 重叠区域字符数（默认 50）

    Returns:
        切片列表
    """
    if not text or not text.strip():
        return []

    text = text.strip()

    # 如果文本足够短，直接返回
    if len(text) <= max_chunk_size:
        return [text]

    # 第一步：按段落切分
    paragraphs = re.split(r"\n\s*\n", text)
    paragraphs = [p.strip() for p in paragraphs if p.strip()]

    # 第二步：对超长段落按句子切分
    segments = []
    for para in paragraphs:
        if len(para) <= max_chunk_size:
            segments.append(para)
        else:
            # 按句子切分（中文句号、问号、感叹号、英文句号）
            sentences = re.split(r"(?<=[。！？.!?])\s*", para)
            sentences = [s.strip() for s in sentences if s.strip()]
            segments.extend(sentences)

    # 第三步：合并 segments 为 chunks，保留 overlap
    chunks = []
    current_chunk = ""

    for segment in segments:
        # 如果当前 segment 本身就超过 max_chunk_size，需要进一步拆分
        if len(segment) > max_chunk_size:
            # 先保存当前 chunk
            if current_chunk:
                chunks.append(current_chunk.strip())
                current_chunk = ""

            # 按字符数硬切分（尽量在标点处断开）
            sub_chunks = _hard_split(segment, max_chunk_size)
            chunks.extend(sub_chunks)
            continue

        # 尝试将 segment 追加到当前 chunk
        candidate = f"{current_chunk}\n{segment}".strip() if current_chunk else segment

        if len(candidate) <= max_chunk_size:
            current_chunk = candidate
        else:
            # 当前 chunk 已满，保存并开始新 chunk
            if current_chunk:
                chunks.append(current_chunk.strip())
                # 保留 overlap 区域
                overlap_text = current_chunk[-overlap:] if len(current_chunk) > overlap else current_chunk
                # 找到 overlap 中的第一个完整句子开始位置
                sentence_start = _find_sentence_start(overlap_text)
                if sentence_start > 0:
                    overlap_text = overlap_text[sentence_start:]
                current_chunk = f"{overlap_text}\n{segment}".strip()
            else:
                current_chunk = segment

    # 保存最后一个 chunk
    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    return chunks


def _hard_split(text: str, max_size: int) -> list[str]:
    """
    按字符数硬切分长文本，尽量在标点处断开

    Args:
        text: 待切分文本
        max_size: 每段最大字符数

    Returns:
        切分后的文本列表
    """
    chunks = []
    while len(text) > max_size:
        # 在 max_size 附近找标点断点
        split_pos = max_size
        # 向前查找标点
        for i in range(max_size - 1, max_size // 2, -1):
            if i < len(text) and text[i] in "。！？.!?\n":
                split_pos = i + 1
                break

        chunks.append(text[:split_pos].strip())
        text = text[split_pos:].strip()

    if text:
        chunks.append(text)

    return chunks


def _find_sentence_start(text: str) -> int:
    """
    找到文本中第一个完整句子的开始位置

    跳过不完整的句子片段，找到下一个句子的开始。

    Args:
        text: 文本片段

    Returns:
        第一个完整句子开始的位置索引
    """
    # 找到第一个句号后的位置
    for i, ch in enumerate(text):
        if ch in "。！？.!?\n" and i + 1 < len(text):
            # 跳过空白字符
            j = i + 1
            while j < len(text) and text[j] in " \t\n":
                j += 1
            if j < len(text):
                return j
    return 0

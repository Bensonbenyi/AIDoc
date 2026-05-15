"""
BM25 检索服务

基于 PostgreSQL 全文检索实现 BM25 关键词搜索。
由于 PostgreSQL 中文分词配置复杂，MVP 方案使用 ILIKE 模糊匹配。
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge_chunk import KnowledgeChunk
from app.models.document import Document


class BM25Service:
    """BM25 关键词检索服务"""

    async def search(
        self,
        db: AsyncSession,
        query: str,
        scope: str = "current_document",
        document_id: uuid.UUID | None = None,
        top_k: int = 10,
    ) -> list[dict]:
        """
        BM25 关键词检索

        使用 ILIKE 模糊匹配实现简单的中文关键词检索。
        根据关键词命中次数计算简易相关度评分。

        Args:
            db: 数据库会话
            query: 搜索查询
            scope: 检索范围（current_document / document_tree / all_workspace）
            document_id: 文档 ID（current_document 和 document_tree 模式需要）
            top_k: 返回结果数量

        Returns:
            检索结果列表，每项包含 chunk_id, block_id, document_id, block_type, score, chunk_text
        """
        if not query.strip():
            return []

        # 提取关键词（按空格和标点分词）
        keywords = self._extract_keywords(query)
        if not keywords:
            return []

        # 构建基础查询
        stmt = select(KnowledgeChunk)

        # 范围过滤
        if scope == "current_document" and document_id:
            stmt = stmt.where(KnowledgeChunk.document_id == document_id)
        elif scope == "document_tree" and document_id:
            # 获取当前文档及其所有子孙文档的 ID
            doc_ids = await self._get_descendant_doc_ids(db, document_id)
            stmt = stmt.where(KnowledgeChunk.document_id.in_(doc_ids))

        # 执行查询获取所有候选 chunk
        result = await db.execute(stmt)
        chunks = list(result.scalars().all())

        # 计算每个 chunk 的 BM25 分数
        scored_chunks = []
        for chunk in chunks:
            text = chunk.bm25_text or chunk.chunk_text or ""
            score = self._calculate_bm25_score(text, keywords)
            if score > 0:
                scored_chunks.append({
                    "chunk_id": chunk.id,
                    "block_id": chunk.block_id,
                    "document_id": chunk.document_id,
                    "block_type": chunk.block_type,
                    "score": score,
                    "chunk_text": chunk.chunk_text[:200],
                })

        # 按分数降序排列，取 top_k
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    def _extract_keywords(self, query: str) -> list[str]:
        """
        从查询中提取关键词

        简单实现：按空格和中文标点分词，过滤过短的词。
        """
        import re
        # 按空格和标点分词
        tokens = re.split(r"[\s,，。！？.!?\n\t]+", query)
        # 过滤空字符串和单字符（中文单字通常不是有意义的关键词）
        keywords = [t.strip() for t in tokens if len(t.strip()) >= 2]
        return keywords

    def _calculate_bm25_score(self, text: str, keywords: list[str]) -> float:
        """
        计算简易 BM25 分数

        基于关键词在文本中的命中次数和覆盖率计算分数。

        Args:
            text: 待检索文本
            keywords: 关键词列表

        Returns:
            相关度分数（0-1 之间）
        """
        if not text or not keywords:
            return 0.0

        text_lower = text.lower()
        hit_count = 0
        hit_keywords = 0

        for kw in keywords:
            kw_lower = kw.lower()
            count = text_lower.count(kw_lower)
            if count > 0:
                hit_keywords += 1
                # 命中次数的对数衰减（避免长文本过度占优）
                hit_count += min(count, 5)  # 单个关键词最多计 5 次

        if hit_keywords == 0:
            return 0.0

        # 分数组成：命中关键词覆盖率 * 0.6 + 归一化命中次数 * 0.4
        coverage = hit_keywords / len(keywords)
        normalized_count = min(hit_count / (len(keywords) * 3), 1.0)

        return coverage * 0.6 + normalized_count * 0.4

    async def _get_descendant_doc_ids(
        self, db: AsyncSession, document_id: uuid.UUID
    ) -> list[uuid.UUID]:
        """获取文档及其所有子孙文档的 ID 列表"""
        ids = [document_id]

        # 递归查找子文档
        stmt = select(Document.id).where(Document.parent_id == document_id)
        result = await db.execute(stmt)
        child_ids = [row[0] for row in result.all()]

        for child_id in child_ids:
            descendant_ids = await self._get_descendant_doc_ids(db, child_id)
            ids.extend(descendant_ids)

        return ids


# 全局单例
bm25_service = BM25Service()

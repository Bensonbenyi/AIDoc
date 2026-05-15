"""
RAG Service

实现 Block-aware Hierarchical RAG 的完整流程：
- 文档索引（block → text → chunk → embedding → knowledge_chunks）
- 混合检索（向量检索 + BM25 检索 + Reranker 重排）
- 上下文扩展（获取相邻 block、父级 heading、文档摘要）
- 知识上下文构建（格式化为 prompt 使用的文本）
"""

import uuid

from loguru import logger
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_block import DocumentBlock
from app.models.knowledge_chunk import KnowledgeChunk
from app.services.embedding_service import embedding_service
from app.services.bm25_service import bm25_service
from app.services.reranker_service import reranker_service
from app.services.summary_service import summary_service
from app.utils.block_text_converter import convert_block_to_text, convert_block_to_bm25_text
from app.utils.text_splitter import split_text


class RAGService:
    """RAG 检索服务"""

    async def index_document(self, db: AsyncSession, document_id: uuid.UUID) -> int:
        """
        索引单个文档

        流程：
        1. 获取文档所有 block
        2. 对每个 block 调用 block_text_converter 生成可索引文本
        3. 如果文本过长，调用 text_splitter 切片
        4. 为每个 chunk 生成 embedding
        5. 写入 knowledge_chunks 表
        6. 同时生成/更新文档摘要

        Args:
            db: 数据库会话
            document_id: 文档 ID

        Returns:
            生成的 chunk 数量
        """
        # 获取文档信息
        doc = await db.get(Document, document_id)
        if not doc or doc.is_deleted:
            raise ValueError("文档不存在")

        # 获取文档所有 block
        blocks_stmt = (
            select(DocumentBlock)
            .where(DocumentBlock.document_id == document_id)
            .order_by(DocumentBlock.sort_order)
        )
        blocks_result = await db.execute(blocks_stmt)
        blocks = list(blocks_result.scalars().all())

        # 删除该文档的旧索引
        await db.execute(
            delete(KnowledgeChunk).where(KnowledgeChunk.document_id == document_id)
        )

        # 构建 heading 路径（用于上下文定位）
        heading_path = self._build_heading_path(blocks)

        # 为每个 block 生成 chunk
        all_chunks: list[dict] = []
        for block in blocks:
            text = convert_block_to_text(block.block_type, block.content)
            if not text.strip() or block.block_type == "divider":
                continue

            bm25_text = convert_block_to_bm25_text(block.block_type, block.content)

            # 获取该 block 的 heading 路径
            block_heading_path = heading_path.get(str(block.id), "")

            # 如果文本过长，切分为多个 chunk
            chunks_text = split_text(text, max_chunk_size=500, overlap=50)

            for chunk_text in chunks_text:
                all_chunks.append({
                    "block_id": block.id,
                    "block_type": block.block_type,
                    "chunk_text": chunk_text,
                    "bm25_text": bm25_text,
                    "heading_path": block_heading_path,
                    "document_path": doc.path,
                })

        if not all_chunks:
            logger.info(f"文档无可索引内容: {document_id}")
            return 0

        # 批量生成 embedding
        texts_to_embed = [c["chunk_text"] for c in all_chunks]
        try:
            embeddings = await embedding_service.embed_batch(texts_to_embed)
        except Exception as e:
            logger.error(f"Embedding 生成失败: {e}")
            # 降级：不生成 embedding，只保存文本
            embeddings = [[] for _ in all_chunks]

        # 写入 knowledge_chunks 表
        for i, chunk_data in enumerate(all_chunks):
            embedding = embeddings[i] if i < len(embeddings) else []
            kc = KnowledgeChunk(
                id=uuid.uuid4(),
                document_id=document_id,
                block_id=chunk_data["block_id"],
                chunk_text=chunk_data["chunk_text"],
                embedding=embedding if embedding else None,
                bm25_text=chunk_data["bm25_text"],
                block_type=chunk_data["block_type"],
                heading_path=chunk_data["heading_path"],
                document_path=chunk_data["document_path"],
            )
            db.add(kc)

        await db.flush()
        logger.info(f"文档索引完成: document_id={document_id}, chunks={len(all_chunks)}")

        # 异步生成文档摘要（不阻塞索引流程）
        try:
            await summary_service.generate_summary(db, document_id)
        except Exception as e:
            logger.warning(f"文档摘要生成失败（不影响索引）: {e}")

        return len(all_chunks)

    async def reindex_all(self, db: AsyncSession) -> int:
        """
        重新索引所有文档

        Returns:
            索引的文档数量
        """
        stmt = select(Document.id).where(Document.is_deleted == False)
        result = await db.execute(stmt)
        doc_ids = [row[0] for row in result.all()]

        indexed_count = 0
        for doc_id in doc_ids:
            try:
                await self.index_document(db, doc_id)
                indexed_count += 1
            except Exception as e:
                logger.error(f"文档索引失败: {doc_id}, error={e}")

        logger.info(f"全量索引完成: {indexed_count}/{len(doc_ids)} 个文档")
        return indexed_count

    async def search(
        self,
        db: AsyncSession,
        query: str,
        scope: str = "current_document",
        document_id: uuid.UUID | None = None,
        top_k: int = 5,
    ) -> list[dict]:
        """
        混合检索（向量检索 + BM25 检索 + Reranker 重排）

        流程：
        1. 对 query 生成 embedding
        2. 在 pgvector 中执行余弦相似度搜索
        3. 执行 BM25 关键词检索
        4. 合并去重
        5. 使用 Reranker 重排（或加权合并）

        Args:
            db: 数据库会话
            query: 用户查询
            scope: 检索范围
            document_id: 文档 ID
            top_k: 返回结果数量

        Returns:
            检索结果列表
        """
        # 向量检索
        vector_results = await self._vector_search(
            db, query, scope, document_id, top_k=top_k * 2
        )

        # BM25 检索
        bm25_results = await bm25_service.search(
            db, query, scope, document_id, top_k=top_k * 2
        )

        # 合并结果
        all_candidates = []
        seen_block_ids = set()

        for r in vector_results:
            block_id = str(r["block_id"])
            if block_id not in seen_block_ids:
                r["source"] = "vector"
                all_candidates.append(r)
                seen_block_ids.add(block_id)

        for r in bm25_results:
            block_id = str(r["block_id"])
            if block_id not in seen_block_ids:
                r["source"] = "bm25"
                all_candidates.append(r)
                seen_block_ids.add(block_id)

        # Reranker 重排
        reranked = await reranker_service.rerank(query, all_candidates, top_k=top_k)

        return reranked

    async def expand_context(
        self, db: AsyncSession, chunks: list[dict]
    ) -> dict:
        """
        扩展检索结果的上下文

        对每个命中的 chunk：
        - 获取相邻 block（前一个和后一个）
        - 获取父级 heading（向上查找最近的 heading block）
        - 获取文档摘要
        - 获取文档路径

        Args:
            db: 数据库会话
            chunks: 检索结果列表

        Returns:
            扩展后的上下文字典
        """
        expanded = {
            "chunks": [],
            "doc_summaries": {},
        }

        for chunk in chunks:
            block_id = chunk.get("block_id")
            document_id = chunk.get("document_id")

            # 获取当前 block
            block = await db.get(DocumentBlock, block_id)
            if not block:
                continue

            # 获取文档所有 block（用于找相邻 block）
            all_blocks_stmt = (
                select(DocumentBlock)
                .where(DocumentBlock.document_id == document_id)
                .order_by(DocumentBlock.sort_order)
            )
            all_blocks_result = await db.execute(all_blocks_stmt)
            all_blocks = list(all_blocks_result.scalars().all())

            # 找到当前 block 在列表中的位置
            block_index = -1
            for i, b in enumerate(all_blocks):
                if b.id == block_id:
                    block_index = i
                    break

            # 获取前一个 block
            prev_block = None
            if block_index > 0:
                prev_b = all_blocks[block_index - 1]
                prev_text = convert_block_to_text(prev_b.block_type, prev_b.content)
                if prev_text.strip():
                    prev_block = {
                        "block_type": prev_b.block_type,
                        "text": prev_text[:200],
                    }

            # 获取后一个 block
            next_block = None
            if block_index < len(all_blocks) - 1:
                next_b = all_blocks[block_index + 1]
                next_text = convert_block_to_text(next_b.block_type, next_b.content)
                if next_text.strip():
                    next_block = {
                        "block_type": next_b.block_type,
                        "text": next_text[:200],
                    }

            # 获取父级 heading
            parent_heading = self._find_parent_heading(all_blocks, block_index)

            expanded_chunk = {
                "chunk": chunk,
                "prev_block": prev_block,
                "next_block": next_block,
                "parent_heading": parent_heading,
            }
            expanded["chunks"].append(expanded_chunk)

            # 收集文档摘要
            doc_id_str = str(document_id)
            if doc_id_str not in expanded["doc_summaries"]:
                summary = await summary_service.get_summary(db, document_id)
                doc = await db.get(Document, document_id)
                expanded["doc_summaries"][doc_id_str] = {
                    "title": doc.title if doc else "",
                    "path": doc.path if doc else "",
                    "summary": summary or "",
                }

        return expanded

    def build_knowledge_context(self, expanded_context: dict) -> str:
        """
        将扩展后的上下文格式化为 prompt 中使用的 knowledge context 文本

        格式参照 tech.md 10.10 节。

        Args:
            expanded_context: expand_context 返回的字典

        Returns:
            格式化的 knowledge context 文本
        """
        parts = []

        # 添加文档摘要
        for doc_id, doc_info in expanded_context.get("doc_summaries", {}).items():
            parts.append(f"## 文档: {doc_info['title']}")
            parts.append(f"路径: {doc_info['path']}")
            if doc_info["summary"]:
                parts.append(f"摘要: {doc_info['summary']}")
            parts.append("")

        # 添加检索到的 chunk 及其上下文
        parts.append("## 相关内容\n")

        for i, item in enumerate(expanded_context.get("chunks", []), 1):
            chunk = item["chunk"]
            parts.append(f"### [来源 {i}]")

            # 父级 heading
            if item.get("parent_heading"):
                parts.append(f"章节: {item['parent_heading']}")

            # 前一个 block
            if item.get("prev_block"):
                prev = item["prev_block"]
                parts.append(f"(前文) [{prev['block_type']}] {prev['text']}")

            # 当前 chunk 内容
            parts.append(f"({chunk.get('block_type', 'text')}) {chunk.get('chunk_text', '')}")

            # 后一个 block
            if item.get("next_block"):
                nxt = item["next_block"]
                parts.append(f"(后文) [{nxt['block_type']}] {nxt['text']}")

            parts.append("")

        return "\n".join(parts)

    async def _vector_search(
        self,
        db: AsyncSession,
        query: str,
        scope: str,
        document_id: uuid.UUID | None,
        top_k: int = 10,
    ) -> list[dict]:
        """
        向量检索

        对 query 生成 embedding，在 pgvector 中执行余弦相似度搜索。
        """
        try:
            query_embedding = await embedding_service.embed_text(query)
        except Exception as e:
            logger.warning(f"Query embedding 生成失败: {e}")
            return []

        if not query_embedding:
            return []

        # 构建查询
        # pgvector 余弦距离: 1 - cosine_similarity
        # 使用 l2_distance 或 cosine_distance
        from pgvector.sqlalchemy import Vector
        from sqlalchemy import text

        # 使用原生 SQL 执行向量检索（pgvector 的 ORM 支持有限）
        # 构建基础 SQL
        sql = """
            SELECT id, document_id, block_id, block_type, chunk_text,
                   1 - (embedding <=> :query_embedding) as score
            FROM knowledge_chunks
            WHERE embedding IS NOT NULL
        """
        params = {"query_embedding": str(query_embedding)}

        # 范围过滤
        if scope == "current_document" and document_id:
            sql += " AND document_id = :doc_id"
            params["doc_id"] = str(document_id)
        elif scope == "document_tree" and document_id:
            doc_ids = await bm25_service._get_descendant_doc_ids(db, document_id)
            if doc_ids:
                placeholders = ", ".join(f":doc_id_{i}" for i in range(len(doc_ids)))
                sql += f" AND document_id IN ({placeholders})"
                for i, did in enumerate(doc_ids):
                    params[f"doc_id_{i}"] = str(did)

        sql += " ORDER BY embedding <=> :query_embedding LIMIT :limit"
        params["limit"] = top_k

        try:
            result = await db.execute(text(sql), params)
            rows = result.fetchall()

            return [
                {
                    "chunk_id": row[0],
                    "document_id": row[1],
                    "block_id": row[2],
                    "block_type": row[3],
                    "chunk_text": row[4][:200],
                    "score": float(row[5]),
                }
                for row in rows
            ]
        except Exception as e:
            logger.warning(f"向量检索失败: {e}")
            return []

    def _build_heading_path(self, blocks: list[DocumentBlock]) -> dict[str, str]:
        """
        构建每个 block 的 heading 路径

        向上查找最近的 heading block，拼接为路径。

        Returns:
            {block_id_str: heading_path} 字典
        """
        heading_path: dict[str, str] = {}
        current_headings: dict[int, str] = {}  # level -> heading text

        for block in blocks:
            if block.block_type in ("heading_1", "heading_2", "heading_3"):
                level = int(block.block_type[-1])
                text = (block.content or {}).get("text", "")
                current_headings[level] = text
                # 清除更深层级的 heading
                for l in list(current_headings.keys()):
                    if l > level:
                        del current_headings[l]

            # 构建路径
            path_parts = []
            for level in sorted(current_headings.keys()):
                path_parts.append(current_headings[level])
            heading_path[str(block.id)] = " > ".join(path_parts)

        return heading_path

    def _find_parent_heading(
        self, blocks: list[DocumentBlock], current_index: int
    ) -> str | None:
        """
        向上查找最近的 heading block

        Args:
            blocks: 文档所有 block 列表
            current_index: 当前 block 的索引

        Returns:
            heading 文本，如果没有找到返回 None
        """
        for i in range(current_index - 1, -1, -1):
            if blocks[i].block_type in ("heading_1", "heading_2", "heading_3"):
                return (blocks[i].content or {}).get("text", "")
        return None


# 全局单例
rag_service = RAGService()

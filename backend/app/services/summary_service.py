"""
文档摘要 Service

使用 LLM 生成和管理文档摘要。
"""

import uuid

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_block import DocumentBlock
from app.models.document_summary import DocumentSummary
from app.services.ai_service import ai_service
from app.utils.block_text_converter import convert_block_to_text


class SummaryService:
    """文档摘要服务"""

    async def generate_summary(
        self, db: AsyncSession, document_id: uuid.UUID
    ) -> DocumentSummary:
        """
        生成文档摘要

        获取文档所有 block 内容，拼接为文本后调用 LLM 生成摘要。

        Args:
            db: 数据库会话
            document_id: 文档 ID

        Returns:
            DocumentSummary 对象
        """
        # 获取文档信息
        doc = await db.get(Document, document_id)
        if not doc:
            raise ValueError("文档不存在")

        # 获取文档所有 block
        stmt = (
            select(DocumentBlock)
            .where(DocumentBlock.document_id == document_id)
            .order_by(DocumentBlock.sort_order)
        )
        result = await db.execute(stmt)
        blocks = list(result.scalars().all())

        # 拼接 block 内容为文本
        text_parts = []
        for block in blocks:
            text = convert_block_to_text(block.block_type, block.content)
            if text.strip():
                text_parts.append(text)

        full_text = "\n\n".join(text_parts)

        if not full_text.strip():
            full_text = "（空文档）"

        # 调用 LLM 生成摘要
        from app.services.ai_service import load_prompt

        system_prompt = load_prompt("document_summary_system")
        messages = [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": f"请为以下文档生成摘要：\n\n文档标题：{doc.title}\n文档路径：{doc.path}\n\n{full_text[:4000]}",
            },
        ]

        try:
            raw_response = await ai_service._call_llm(messages, max_tokens=512)
            parsed = ai_service._parse_ai_response(raw_response)
            summary_text = parsed.get("answer", raw_response)
            key_points = parsed.get("references", [])
        except Exception as e:
            logger.warning(f"LLM 摘要生成失败，使用截断文本作为摘要: {e}")
            summary_text = full_text[:500]
            key_points = []

        # 保存或更新摘要
        existing_stmt = select(DocumentSummary).where(
            DocumentSummary.document_id == document_id
        )
        existing_result = await db.execute(existing_stmt)
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.summary_text = summary_text
            existing.key_points = key_points if isinstance(key_points, list) else []
            await db.commit()
            await db.refresh(existing)
            logger.info(f"文档摘要已更新: document_id={document_id}")
            return existing
        else:
            summary = DocumentSummary(
                id=uuid.uuid4(),
                document_id=document_id,
                summary_text=summary_text,
                key_points=key_points if isinstance(key_points, list) else [],
            )
            db.add(summary)
            await db.commit()
            await db.refresh(summary)
            logger.info(f"文档摘要已生成: document_id={document_id}")
            return summary

    async def get_summary(
        self, db: AsyncSession, document_id: uuid.UUID
    ) -> str | None:
        """
        获取缓存的文档摘要

        如果不存在则触发生成。

        Args:
            db: 数据库会话
            document_id: 文档 ID

        Returns:
            摘要文本，如果无法生成则返回 None
        """
        stmt = select(DocumentSummary).where(
            DocumentSummary.document_id == document_id
        )
        result = await db.execute(stmt)
        summary = result.scalar_one_or_none()

        if summary:
            return summary.summary_text

        # 不存在则触发生成
        try:
            summary = await self.generate_summary(db, document_id)
            return summary.summary_text
        except Exception as e:
            logger.error(f"文档摘要生成失败: {e}")
            return None


# 全局单例
summary_service = SummaryService()

"""
AI 对话 API 路由

提供普通对话、文档问答、会话管理、上下文构建等接口
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.ai import (
    AIChatRequest,
    AIContextRequest,
    AIContextResponse,
    AIDocumentQARequest,
    AIReference,
    AIResponse,
)
from app.services.ai_service import ai_service
from app.utils.block_text_converter import convert_block_to_text

router = APIRouter()


# ==============================
# 会话管理
# ==============================


@router.post("/sessions", summary="创建对话会话")
async def create_session(
    document_id: uuid.UUID | None = None,
    title: str = "新对话",
    db: AsyncSession = Depends(get_db),
):
    """
    创建新的 AI 对话会话

    - **document_id**: 关联的文档 ID（可选）
    - **title**: 会话标题
    """
    session = await ai_service.create_session(db, document_id, title)
    return {
        "id": session.id,
        "document_id": session.document_id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


@router.get("/sessions/{session_id}", summary="获取会话详情")
async def get_session(
    session_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """获取对话会话详情"""
    session = await ai_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    return {
        "id": session.id,
        "document_id": session.document_id,
        "title": session.title,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
    }


@router.get("/sessions/{session_id}/messages", summary="获取对话历史")
async def get_messages(
    session_id: uuid.UUID,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """
    获取对话历史消息

    - **session_id**: 会话 ID
    - **limit**: 返回消息数量上限（默认 50）
    """
    # 验证会话存在
    session = await ai_service.get_session(db, session_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    messages = await ai_service.get_messages(db, session_id, limit)
    return [
        {
            "id": msg.id,
            "session_id": msg.session_id,
            "role": msg.role,
            "content": msg.content,
            "references": msg.references,
            "created_at": msg.created_at.isoformat(),
        }
        for msg in messages
    ]


@router.get("/documents/{document_id}/sessions", summary="获取文档的对话会话列表")
async def get_sessions_by_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """获取指定文档的所有对话会话"""
    sessions = await ai_service.get_sessions_by_document(db, document_id)
    return [
        {
            "id": s.id,
            "document_id": s.document_id,
            "title": s.title,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


# ==============================
# AI 对话
# ==============================


@router.post("/chat", summary="普通 AI 对话", response_model=AIResponse)
async def chat(
    request: AIChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    普通 AI 对话

    - **session_id**: 会话 ID（为空则自动创建新会话）
    - **message**: 用户消息
    """
    # 如果没有 session_id，创建新会话
    if not request.session_id:
        session = await ai_service.create_session(db)
        session_id = session.id
    else:
        session_id = request.session_id
        # 验证会话存在
        session = await ai_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")

    # 调用 AI 服务
    result = await ai_service.chat(db, session_id, request.message)

    # 构造引用列表
    references = []
    for ref in result.get("references", []):
        if isinstance(ref, dict):
            references.append(AIReference(
                doc_id=ref.get("doc_id", uuid.uuid4()),
                block_id=ref.get("block_id", uuid.uuid4()),
                block_type=ref.get("block_type", "text"),
                content_preview=ref.get("quote", ref.get("content_preview", "")),
            ))

    return AIResponse(
        message_id=result["message_id"],
        answer=result["answer"],
        references=references,
        confidence=result.get("confidence"),
        session_id=session_id,
    )


@router.post("/chat/stream", summary="流式 AI 对话")
async def chat_stream(
    request: AIChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    流式 AI 对话（SSE）

    返回 Server-Sent Events 流
    """
    if not request.session_id:
        session = await ai_service.create_session(db)
        session_id = session.id
    else:
        session_id = request.session_id
        session = await ai_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")

    return StreamingResponse(
        ai_service.stream_chat(db, session_id, request.message),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ==============================
# 上下文构建 API
# ==============================


@router.post("/context/document", summary="获取文档内容作为上下文", response_model=AIContextResponse)
async def get_document_context(
    request: AIContextRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    获取文档全部 block 内容，转换为文本上下文。

    用于前端拖拽文档到 AI 聊天框时，实时读取文档内容。
    """
    if not request.document_id:
        raise HTTPException(status_code=400, detail="document_id 不能为空")

    from app.models.document import Document
    from app.models.document_block import DocumentBlock

    # 获取文档信息
    doc_stmt = select(Document).where(Document.id == request.document_id)
    doc_result = await db.execute(doc_stmt)
    doc = doc_result.scalar_one_or_none()

    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")

    # 获取文档的所有 block
    blocks_stmt = (
        select(DocumentBlock)
        .where(DocumentBlock.document_id == request.document_id)
        .order_by(DocumentBlock.sort_order)
    )
    blocks_result = await db.execute(blocks_stmt)
    blocks = list(blocks_result.scalars().all())

    # 拼接上下文
    context_parts = [f"## 文档: {doc.title}\n路径: {doc.path}\n"]

    for i, block in enumerate(blocks, 1):
        text = convert_block_to_text(block.block_type, block.content)
        if text.strip():
            context_parts.append(f"[来源 {i}] ({block.block_type})\n{text}\n")

    context = "\n".join(context_parts)

    return AIContextResponse(
        context=context,
        source_type="document",
        source_title=doc.title,
    )


@router.post("/context/block", summary="获取 Block 内容作为上下文", response_model=AIContextResponse)
async def get_block_context(
    request: AIContextRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    获取单个 block 内容，转换为文本上下文。

    用于前端拖拽单个 block 到 AI 聊天框时，实时读取 block 内容。
    """
    if not request.block_id:
        raise HTTPException(status_code=400, detail="block_id 不能为空")

    from app.models.document_block import DocumentBlock
    from app.models.document import Document

    # 获取 block
    block_stmt = select(DocumentBlock).where(DocumentBlock.id == request.block_id)
    block_result = await db.execute(block_stmt)
    block = block_result.scalar_one_or_none()

    if not block:
        raise HTTPException(status_code=404, detail="Block 不存在")

    # 获取所属文档标题
    doc_stmt = select(Document).where(Document.id == block.document_id)
    doc_result = await db.execute(doc_stmt)
    doc = doc_result.scalar_one_or_none()
    doc_title = doc.title if doc else "未知文档"

    # 转换为文本
    text = convert_block_to_text(block.block_type, block.content)
    context = f"## 来自文档: {doc_title}\nBlock 类型: {block.block_type}\n\n{text}"

    return AIContextResponse(
        context=context,
        source_type="block",
        source_title=f"{doc_title} - {block.block_type}",
    )


# ==============================
# 文档问答
# ==============================


@router.post("/document-qa", summary="基于文档问答", response_model=AIResponse)
async def document_qa(
    request: AIDocumentQARequest,
    db: AsyncSession = Depends(get_db),
):
    """
    基于文档内容的智能问答

    - **document_id**: 文档 ID
    - **question**: 用户问题
    - **scope**: 检索范围（current_document / document_tree / all_workspace）
    - **context_document_id**: 拖拽的文档 ID（可选，直接读取其内容作为上下文）
    - **context_block_ids**: 拖拽的 block ID 列表（可选，读取这些 block 内容作为上下文）

    如果提供了 context_document_id 或 context_block_ids，直接读取对应内容作为上下文。
    否则读取当前文档全部 block 作为默认上下文。
    """
    from app.models.document import Document
    from app.models.document_block import DocumentBlock

    # 构建上下文
    context = ""

    if request.context_document_id:
        # 拖拽了文档：读取该文档全部 block
        doc_stmt = select(Document).where(Document.id == request.context_document_id)
        doc_result = await db.execute(doc_stmt)
        doc = doc_result.scalar_one_or_none()

        if doc:
            blocks_stmt = (
                select(DocumentBlock)
                .where(DocumentBlock.document_id == request.context_document_id)
                .order_by(DocumentBlock.sort_order)
            )
            blocks_result = await db.execute(blocks_stmt)
            blocks = list(blocks_result.scalars().all())

            context_parts = [f"## 文档: {doc.title}\n路径: {doc.path}\n"]
            for i, block in enumerate(blocks, 1):
                text = convert_block_to_text(block.block_type, block.content)
                if text.strip():
                    context_parts.append(f"[来源 {i}] ({block.block_type})\n{text}\n")
            context = "\n".join(context_parts)

    elif request.context_block_ids:
        # 拖拽了 block：读取这些 block 的内容
        context_parts = []
        for block_id in request.context_block_ids:
            block_stmt = select(DocumentBlock).where(DocumentBlock.id == block_id)
            block_result = await db.execute(block_stmt)
            block = block_result.scalar_one_or_none()

            if block:
                text = convert_block_to_text(block.block_type, block.content)
                if text.strip():
                    context_parts.append(f"[Block {block.block_type}]\n{text}\n")
                    logger.info(f"引用 block 上下文: id={block_id}, type={block.block_type}, text_len={len(text)}")
                else:
                    logger.warning(f"引用 block 内容为空: id={block_id}, type={block.block_type}")
            else:
                logger.warning(f"引用 block 未找到: id={block_id}")

        if context_parts:
            context = "\n".join(context_parts)
            logger.info(f"构建引用上下文完成: {len(context_parts)} 个 block, 总长度 {len(context)}")
        else:
            logger.warning(f"所有引用 block 均未找到或内容为空, ids={request.context_block_ids}")

    if not context and request.document_id:
        # 没有拖拽上下文，读取当前文档全部 block 作为默认上下文
        context = await _build_document_context(db, request.document_id)

    # 复用已有会话或创建新会话
    if request.session_id:
        session_id = request.session_id
        session = await ai_service.get_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="会话不存在")
    else:
        session = await ai_service.create_session(
            db,
            document_id=request.document_id,
            title=f"文档问答: {request.question[:30]}",
        )
        session_id = session.id

    # 调用 AI 服务（带历史消息上下文）
    result = await ai_service.chat(db, session_id, request.question, context=context)

    # 构造引用列表
    references = []
    for ref in result.get("references", []):
        if isinstance(ref, dict):
            doc_id = ref.get("doc_id") or request.document_id or uuid.uuid4()
            references.append(AIReference(
                doc_id=doc_id,
                block_id=ref.get("block_id", uuid.uuid4()),
                block_type=ref.get("block_type", "text"),
                content_preview=ref.get("quote", ref.get("content_preview", "")),
            ))

    return AIResponse(
        message_id=result["message_id"],
        answer=result["answer"],
        references=references,
        confidence=result.get("confidence"),
        session_id=session_id,
    )


# ==============================
# 辅助函数
# ==============================


async def _build_document_context(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> str:
    """
    构建文档上下文（读取文档全部 block 内容）

    当没有拖拽上下文时，使用当前文档的全部内容作为默认上下文。
    """
    from app.models.document_block import DocumentBlock
    from app.models.document import Document

    # 获取文档信息
    doc_stmt = select(Document).where(Document.id == document_id)
    doc_result = await db.execute(doc_stmt)
    doc = doc_result.scalar_one_or_none()

    if not doc:
        return ""

    # 获取文档的所有 block
    blocks_stmt = (
        select(DocumentBlock)
        .where(DocumentBlock.document_id == document_id)
        .order_by(DocumentBlock.sort_order)
    )
    blocks_result = await db.execute(blocks_stmt)
    blocks = list(blocks_result.scalars().all())

    # 拼接上下文
    context_parts = [f"## 文档: {doc.title}\n路径: {doc.path}\n"]

    for i, block in enumerate(blocks, 1):
        text = convert_block_to_text(block.block_type, block.content)
        if text.strip():
            context_parts.append(f"[来源 {i}] ({block.block_type})\n{text}\n")

    return "\n".join(context_parts)

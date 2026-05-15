"""
AI 对话 API 路由

提供普通对话、文档问答、会话管理等接口
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.ai import (
    AIChatRequest,
    AIDocumentQARequest,
    AIReference,
    AIResponse,
)
from app.services.ai_service import ai_service

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

    注意：RAG 检索功能将在阶段 8 实现，当前使用占位逻辑
    """
    # TODO: 阶段 8 实现真实的 RAG 检索
    # 当前使用简单的文档内容拼接作为上下文
    context = await _build_placeholder_context(db, request.document_id, request.scope)

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
            references.append(AIReference(
                doc_id=ref.get("doc_id", request.document_id),
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


async def _build_placeholder_context(
    db: AsyncSession,
    document_id: uuid.UUID,
    scope: str,
) -> str:
    """
    构建占位上下文（阶段 8 将替换为 RAG 检索）

    当前实现：获取文档的所有 block 内容拼接为上下文
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
        content = block.content or {}
        text = ""

        if block.block_type in ("paragraph", "heading_1", "heading_2", "heading_3"):
            text = content.get("text", "")
        elif block.block_type in ("bullet_list", "numbered_list"):
            items = content.get("items", [])
            text = "\n".join(f"- {item}" for item in items)
        elif block.block_type == "todo":
            text = content.get("text", "")
            checked = "✓" if content.get("checked") else "○"
            text = f"[{checked}] {text}"
        elif block.block_type == "code":
            text = f"```{content.get('language', '')}\n{content.get('code', '')}\n```"
        elif block.block_type == "quote":
            text = f"> {content.get('text', '')}"
        elif block.block_type == "table":
            headers = content.get("headers", [])
            rows = content.get("rows", [])
            if headers:
                text = " | ".join(str(h) for h in headers) + "\n"
                text += " | ".join("---" for _ in headers) + "\n"
                for row in rows:
                    text += " | ".join(str(cell) for cell in row) + "\n"

        if text.strip():
            context_parts.append(f"[来源 {i}] ({block.block_type})\n{text}\n")

    return "\n".join(context_parts)

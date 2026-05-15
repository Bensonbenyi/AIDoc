"""
Block 管理 API 路由
"""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.block import BlockUpdate, BlockResponse
from app.schemas.whiteboard import WhiteboardSaveRequest, WhiteboardResponse
from app.services import block_service, whiteboard_service

router = APIRouter()


async def _trigger_rag_reindex(document_id: uuid.UUID):
    """后台触发 RAG 索引更新"""
    from app.services.rag_service import rag_service
    from app.database import async_session_factory
    from loguru import logger

    async with async_session_factory() as db:
        try:
            await rag_service.index_document(db, document_id)
            await db.commit()
        except Exception as e:
            logger.warning(f"RAG 索引更新失败: {e}")
            await db.rollback()


@router.patch("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: uuid.UUID,
    data: BlockUpdate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """更新 block"""
    try:
        block = await block_service.update_block(db, block_id, data)
        # 后台更新 RAG 索引
        background_tasks.add_task(_trigger_rag_reindex, block.document_id)
        return block
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{block_id}")
async def delete_block(
    block_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """删除 block"""
    try:
        # 先获取 block 的 document_id（删除后就拿不到了）
        from app.models.document_block import DocumentBlock
        block = await db.get(DocumentBlock, block_id)
        document_id = block.document_id if block else None

        await block_service.delete_block(db, block_id)
        # 后台更新 RAG 索引
        if document_id:
            background_tasks.add_task(_trigger_rag_reindex, document_id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{block_id}/whiteboard", response_model=WhiteboardResponse)
async def save_whiteboard(
    block_id: uuid.UUID,
    data: WhiteboardSaveRequest,
    db: AsyncSession = Depends(get_db),
):
    """保存白板数据"""
    try:
        whiteboard = await whiteboard_service.save_whiteboard(
            db, block_id, data.data_json, data.preview_image_url
        )
        return whiteboard
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{block_id}/whiteboard", response_model=WhiteboardResponse)
async def get_whiteboard(
    block_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """获取白板数据"""
    whiteboard = await whiteboard_service.get_whiteboard(db, block_id)
    if not whiteboard:
        raise HTTPException(status_code=404, detail="白板数据不存在")
    return whiteboard

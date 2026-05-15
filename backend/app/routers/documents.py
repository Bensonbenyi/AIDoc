"""
文档管理 API 路由
"""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.document import (
    DocumentCreate,
    DocumentDetail,
    DocumentResponse,
    DocumentTreeNode,
    DocumentUpdate,
)
from app.schemas.block import BlockCreate, BlockResponse, BlocksBatchSave, BlocksBatchResponse
from app.services import document_service, block_service

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


@router.post("", response_model=DocumentResponse)
async def create_document(
    data: DocumentCreate,
    db: AsyncSession = Depends(get_db),
):
    """创建文档"""
    try:
        doc = await document_service.create_document(db, data)
        return doc
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tree", response_model=list[DocumentTreeNode])
async def get_document_tree(
    db: AsyncSession = Depends(get_db),
):
    """获取文档树"""
    return await document_service.get_document_tree(db)


@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document_detail(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """获取文档详情"""
    try:
        detail = await document_service.get_document_detail(db, document_id)
        return detail
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: uuid.UUID,
    data: DocumentUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新文档"""
    try:
        doc = await document_service.update_document(db, document_id, data)
        return doc
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{document_id}")
async def delete_document(
    document_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """删除文档"""
    try:
        await document_service.delete_document(db, document_id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{document_id}/blocks", response_model=BlocksBatchResponse)
async def batch_save_blocks(
    document_id: uuid.UUID,
    data: BlocksBatchSave,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """批量保存 blocks"""
    try:
        count = await block_service.batch_save_blocks(db, document_id, data.blocks)
        # 后台更新 RAG 索引
        background_tasks.add_task(_trigger_rag_reindex, document_id)
        return {"success": True, "updated_count": count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{document_id}/blocks", response_model=BlockResponse)
async def create_block(
    document_id: uuid.UUID,
    data: BlockCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """创建单个 block"""
    try:
        block = await block_service.create_block(db, document_id, data)
        # 后台更新 RAG 索引
        background_tasks.add_task(_trigger_rag_reindex, document_id)
        return block
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

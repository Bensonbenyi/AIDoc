"""
Block 管理 API 路由
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.block import BlockUpdate, BlockResponse
from app.schemas.whiteboard import WhiteboardSaveRequest, WhiteboardResponse
from app.services import block_service, whiteboard_service

router = APIRouter()


@router.patch("/{block_id}", response_model=BlockResponse)
async def update_block(
    block_id: uuid.UUID,
    data: BlockUpdate,
    db: AsyncSession = Depends(get_db),
):
    """更新 block"""
    try:
        block = await block_service.update_block(db, block_id, data)
        return block
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{block_id}")
async def delete_block(
    block_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """删除 block"""
    try:
        await block_service.delete_block(db, block_id)
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

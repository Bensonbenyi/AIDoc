"""
Block 管理 API 路由
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.block import BlockUpdate, BlockResponse
from app.services import block_service

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

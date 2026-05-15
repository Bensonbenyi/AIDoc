"""
白板 Service 层

实现白板数据的存储和获取逻辑
"""

import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document_block import DocumentBlock
from app.models.whiteboard_data import WhiteboardData


async def save_whiteboard(
    db: AsyncSession,
    block_id: uuid.UUID,
    data_json: Any,
    preview_image_url: str | None = None,
) -> WhiteboardData:
    """
    保存或更新白板数据

    如果 block_id 对应的白板数据不存在则创建，已存在则更新
    """
    # 验证 block 存在且类型为 whiteboard
    block = await db.get(DocumentBlock, block_id)
    if not block:
        raise ValueError("Block 不存在")
    if block.block_type != "whiteboard":
        raise ValueError("Block 类型不是 whiteboard")

    # 查找是否已存在白板数据
    stmt = select(WhiteboardData).where(WhiteboardData.block_id == block_id)
    result = await db.execute(stmt)
    whiteboard = result.scalar_one_or_none()

    if whiteboard:
        # 更新现有数据
        whiteboard.data_json = data_json
        if preview_image_url is not None:
            whiteboard.preview_image_url = preview_image_url
    else:
        # 创建新数据
        whiteboard = WhiteboardData(
            id=uuid.uuid4(),
            block_id=block_id,
            document_id=block.document_id,
            data_json=data_json,
            preview_image_url=preview_image_url,
        )
        db.add(whiteboard)

    await db.flush()
    await db.refresh(whiteboard)
    return whiteboard


async def get_whiteboard(
    db: AsyncSession, block_id: uuid.UUID
) -> WhiteboardData | None:
    """获取白板数据"""
    stmt = select(WhiteboardData).where(WhiteboardData.block_id == block_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()

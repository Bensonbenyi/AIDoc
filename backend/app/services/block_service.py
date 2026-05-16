"""
Block Service 层

实现 block 管理的核心业务逻辑
"""

import uuid

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_block import DocumentBlock
from app.models.whiteboard_data import WhiteboardData
from app.models.chart_3d import Chart3D
from app.schemas.block import BlockCreate, BlockUpdate

VALID_BLOCK_TYPES = {
    "paragraph", "heading_1", "heading_2", "heading_3",
    "bullet_list", "numbered_list", "todo", "table",
    "quote", "divider", "code", "whiteboard", "chart_3d",
    "image", "file", "audio", "video", "link_to_document", "ai_answer",
}


async def create_block(
    db: AsyncSession, document_id: uuid.UUID, data: BlockCreate
) -> DocumentBlock:
    """创建 block"""
    # 验证文档存在
    doc = await db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise ValueError("文档不存在")

    # 验证 block_type 合法
    block_type = data.block_type.value if hasattr(data.block_type, "value") else data.block_type
    if block_type not in VALID_BLOCK_TYPES:
        raise ValueError(f"不支持的 block 类型: {block_type}")

    block = DocumentBlock(
        id=uuid.uuid4(),
        document_id=document_id,
        block_type=block_type,
        content=data.content,
        properties=data.properties,
        sort_order=data.sort_order,
    )
    db.add(block)
    await db.flush()
    await db.refresh(block)
    return block


async def batch_save_blocks(
    db: AsyncSession, document_id: uuid.UUID, blocks: list[BlockCreate]
) -> int:
    """批量保存 blocks（保留已有 ID，删除多余的旧 block）"""
    # 验证文档存在
    doc = await db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise ValueError("文档不存在")

    # 收集新列表中要保留的 block ID
    preserved_ids: set[uuid.UUID] = set()
    for b in blocks:
        if b.id is not None:
            preserved_ids.add(b.id)

    # 一次性查询该文档下所有现有 block（避免 N+1 查询）
    old_blocks_stmt = select(DocumentBlock).where(
        DocumentBlock.document_id == document_id
    )
    old_blocks_result = await db.execute(old_blocks_stmt)
    old_blocks_map: dict[uuid.UUID, DocumentBlock] = {
        b.id: b for b in old_blocks_result.scalars().all()
    }

    # 找出需要删除的 block（不在保留列表中的）
    ids_to_delete = [bid for bid in old_blocks_map if bid not in preserved_ids]

    if ids_to_delete:
        # 删除要丢弃的 block 的关联数据
        await db.execute(
            delete(WhiteboardData).where(WhiteboardData.block_id.in_(ids_to_delete))
        )
        await db.execute(
            delete(Chart3D).where(Chart3D.block_id.in_(ids_to_delete))
        )
        # 删除旧 block
        await db.execute(
            delete(DocumentBlock).where(DocumentBlock.id.in_(ids_to_delete))
        )

    # 创建或更新 block
    for block_data in blocks:
        block_type = (
            block_data.block_type.value
            if hasattr(block_data.block_type, "value")
            else block_data.block_type
        )

        if block_data.id is not None and block_data.id in old_blocks_map:
            # 更新已有 block（直接从 map 获取，无需额外查询）
            existing = old_blocks_map[block_data.id]
            existing.block_type = block_type
            existing.content = block_data.content
            existing.properties = block_data.properties
            existing.sort_order = block_data.sort_order
            continue

        # 创建新 block
        block = DocumentBlock(
            id=block_data.id if block_data.id is not None else uuid.uuid4(),
            document_id=document_id,
            block_type=block_type,
            content=block_data.content,
            properties=block_data.properties,
            sort_order=block_data.sort_order,
        )
        db.add(block)

    await db.flush()
    return len(blocks)


async def update_block(
    db: AsyncSession, block_id: uuid.UUID, data: BlockUpdate
) -> DocumentBlock:
    """更新 block"""
    block = await db.get(DocumentBlock, block_id)
    if not block:
        raise ValueError("Block 不存在")

    if data.content is not None:
        block.content = data.content
    if data.properties is not None:
        block.properties = data.properties

    await db.flush()
    await db.refresh(block)
    return block


async def delete_block(db: AsyncSession, block_id: uuid.UUID) -> bool:
    """删除 block 及其关联数据"""
    block = await db.get(DocumentBlock, block_id)
    if not block:
        raise ValueError("Block 不存在")

    # 删除关联的白板数据
    await db.execute(
        delete(WhiteboardData).where(WhiteboardData.block_id == block_id)
    )

    # 删除关联的图表数据
    await db.execute(
        delete(Chart3D).where(Chart3D.block_id == block_id)
    )

    # 删除 block
    await db.delete(block)
    await db.flush()
    return True


async def get_blocks_by_document(
    db: AsyncSession, document_id: uuid.UUID
) -> list[DocumentBlock]:
    """获取指定文档的所有 block"""
    stmt = (
        select(DocumentBlock)
        .where(DocumentBlock.document_id == document_id)
        .order_by(DocumentBlock.sort_order)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())

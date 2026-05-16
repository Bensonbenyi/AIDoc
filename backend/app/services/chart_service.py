"""
3D 图表 Service 层

实现 3D 图表的存储、获取和生成逻辑
"""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chart_3d import Chart3D
from app.models.document_block import DocumentBlock


async def create_chart(
    db: AsyncSession,
    block_id: uuid.UUID,
    document_id: uuid.UUID,
    source_type: str = "manual",
    source_block_id: uuid.UUID | None = None,
    data_json: dict | None = None,
    chart_config: dict | None = None,
) -> Chart3D:
    """
    创建 3D 图表记录

    Args:
        db: 数据库会话
        block_id: 关联的 block ID
        document_id: 文档 ID
        source_type: 数据来源类型 (manual, table, code_output, csv)
        source_block_id: 数据来源 block ID（从表格或代码导入时）
        data_json: 图表数据
        chart_config: 图表配置
    """
    # 验证 block 存在且类型为 chart_3d
    block = await db.get(DocumentBlock, block_id)
    if not block:
        raise ValueError("Block 不存在")
    if block.block_type != "chart_3d":
        raise ValueError("Block 类型不是 chart_3d")

    chart = Chart3D(
        id=uuid.uuid4(),
        block_id=block_id,
        document_id=document_id,
        source_type=source_type,
        source_block_id=source_block_id,
        data_json=data_json or {},
        chart_config=chart_config or {},
    )
    db.add(chart)
    await db.flush()
    await db.refresh(chart)
    return chart


async def get_chart(db: AsyncSession, chart_id: uuid.UUID) -> Chart3D | None:
    """获取图表数据"""
    return await db.get(Chart3D, chart_id)


async def get_chart_by_block(db: AsyncSession, block_id: uuid.UUID) -> Chart3D | None:
    """根据 block_id 获取图表数据"""
    stmt = select(Chart3D).where(Chart3D.block_id == block_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def update_chart(
    db: AsyncSession,
    chart_id: uuid.UUID,
    data_json: dict | None = None,
    chart_config: dict | None = None,
    source_type: str | None = None,
    source_block_id: uuid.UUID | None = None,
) -> Chart3D:
    """
    更新图表数据

    Args:
        db: 数据库会话
        chart_id: 图表 ID
        data_json: 新的图表数据
        chart_config: 新的图表配置
        source_type: 新的数据来源类型
        source_block_id: 新的数据来源 block ID
    """
    chart = await db.get(Chart3D, chart_id)
    if not chart:
        raise ValueError("图表不存在")

    if data_json is not None:
        chart.data_json = data_json
    if chart_config is not None:
        chart.chart_config = chart_config
    if source_type is not None:
        chart.source_type = source_type
    if source_block_id is not None:
        chart.source_block_id = source_block_id

    await db.flush()
    await db.refresh(chart)
    return chart


async def save_chart_by_block(
    db: AsyncSession,
    block_id: uuid.UUID,
    data_json: dict,
    chart_config: dict | None = None,
    source_type: str = "manual",
    source_block_id: uuid.UUID | None = None,
) -> Chart3D:
    """
    根据 block_id 保存或更新图表数据（upsert 操作）

    如果 block_id 对应的图表数据不存在则创建，已存在则更新
    """
    # 验证 block 存在且类型为 chart_3d
    block = await db.get(DocumentBlock, block_id)
    if not block:
        raise ValueError("Block 不存在")
    if block.block_type != "chart_3d":
        raise ValueError("Block 类型不是 chart_3d")

    # 查找是否已存在图表数据
    chart = await get_chart_by_block(db, block_id)

    if chart:
        # 更新现有数据
        chart.data_json = data_json
        if chart_config is not None:
            chart.chart_config = chart_config
        if source_type:
            chart.source_type = source_type
        if source_block_id is not None:
            chart.source_block_id = source_block_id
    else:
        # 创建新数据
        chart = Chart3D(
            id=uuid.uuid4(),
            block_id=block_id,
            document_id=block.document_id,
            source_type=source_type,
            source_block_id=source_block_id,
            data_json=data_json,
            chart_config=chart_config or {},
        )
        db.add(chart)

    await db.flush()
    await db.refresh(chart)
    return chart

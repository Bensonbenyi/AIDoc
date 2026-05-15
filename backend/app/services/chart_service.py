"""
3D 图表 Service 层

实现 3D 图表的存储、获取和生成逻辑
"""

import json
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


async def generate_chart_from_table(table_data: dict) -> dict:
    """
    从表格数据生成图表配置

    Args:
        table_data: 表格数据，格式为 { headers: [...], rows: [[...], ...] }

    Returns:
        图表数据配置
    """
    headers = table_data.get("headers", [])
    rows = table_data.get("rows", [])

    if not headers or not rows:
        return {"x": [], "y": [], "z": []}

    # 尝试将表格数据映射到 X/Y/Z 轴
    # 默认：第一列为 X，第二列为 Y，第三列为 Z（如果有）
    x_data = []
    y_data = []
    z_data = []

    for row in rows:
        if len(row) > 0:
            x_data.append(row[0])
        if len(row) > 1:
            # 尝试转换为数字
            try:
                y_data.append(float(row[1]))
            except (ValueError, TypeError):
                y_data.append(row[1])
        if len(row) > 2:
            try:
                z_data.append(float(row[2]))
            except (ValueError, TypeError):
                z_data.append(row[2])

    return {
        "x": x_data,
        "y": y_data,
        "z": z_data if z_data else None,
        "x_label": headers[0] if len(headers) > 0 else "X",
        "y_label": headers[1] if len(headers) > 1 else "Y",
        "z_label": headers[2] if len(headers) > 2 else "Z",
    }


async def generate_chart_from_code_output(output_data: dict) -> dict:
    """
    从代码输出生成图表配置

    Args:
        output_data: 代码执行结果，格式为 { stdout: "...", result_json: {...} }

    Returns:
        图表数据配置
    """
    # 尝试从 result_json 中提取数据
    result_json = output_data.get("result_json")

    if result_json and isinstance(result_json, dict):
        # 如果 result_json 已经是图表数据格式
        if "x" in result_json and "y" in result_json:
            return result_json

    # 尝试从 stdout 中解析 JSON 数据
    stdout = output_data.get("stdout", "")
    try:
        # 尝试找到 stdout 中的 JSON 数据
        # 查找第一个 [ 或 { 开始的位置
        start_idx = None
        for i, char in enumerate(stdout):
            if char in ('[', '{'):
                start_idx = i
                break

        if start_idx is not None:
            # 尝试解析 JSON
            parsed = json.loads(stdout[start_idx:])
            if isinstance(parsed, dict) and "x" in parsed and "y" in parsed:
                return parsed
            elif isinstance(parsed, list):
                # 如果是数组，尝试转换为图表数据
                if parsed and isinstance(parsed[0], dict):
                    # 对象数组
                    keys = list(parsed[0].keys())
                    if len(keys) >= 2:
                        return {
                            "x": [item.get(keys[0]) for item in parsed],
                            "y": [item.get(keys[1]) for item in parsed],
                            "z": [item.get(keys[2]) for item in parsed] if len(keys) > 2 else None,
                        }
    except (json.JSONDecodeError, IndexError, KeyError):
        pass

    # 默认返回空数据
    return {"x": [], "y": [], "z": None}

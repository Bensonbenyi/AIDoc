"""
3D 图表 API 路由

提供 3D 图表的创建、获取、更新接口
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.models.document_block import DocumentBlock
from app.schemas.chart import Chart3DCreateRequest, Chart3DResponse
from app.services import chart_service

router = APIRouter()


@router.post("/3d", response_model=Chart3DResponse)
async def create_chart(
    data: Chart3DCreateRequest,
    block_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    """
    创建 3D 图表

    - **document_id**: 文档 ID
    - **source_type**: 数据来源类型 (manual, table, code_output, csv)
    - **source_block_id**: 数据来源 Block ID（从表格或代码导入时）
    - **data_json**: 图表数据 JSON
    """
    try:
        # 如果没有提供 block_id，需要创建一个新的 chart_3d 类型的 block
        # 这里假设 block_id 由前端通过 query parameter 传入
        if not block_id:
            raise HTTPException(
                status_code=400,
                detail="block_id 是必需的，请通过 query parameter 传入"
            )

        chart = await chart_service.create_chart(
            db=db,
            block_id=block_id,
            document_id=data.document_id,
            source_type=data.source_type.value,
            source_block_id=data.source_block_id,
            data_json=data.data_json,
        )
        await db.commit()
        return Chart3DResponse(
            chart_id=chart.id,
            chart_config=chart.chart_config,
            created_at=chart.created_at,
            updated_at=chart.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{chart_id}", response_model=Chart3DResponse)
async def get_chart(
    chart_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """获取 3D 图表数据"""
    chart = await chart_service.get_chart(db, chart_id)
    if not chart:
        raise HTTPException(status_code=404, detail="图表不存在")

    return Chart3DResponse(
        chart_id=chart.id,
        chart_config={**chart.chart_config, "data": chart.data_json},
        created_at=chart.created_at,
        updated_at=chart.updated_at,
    )


@router.patch("/{chart_id}", response_model=Chart3DResponse)
async def update_chart(
    chart_id: uuid.UUID,
    data: Chart3DCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    更新 3D 图表

    - **data_json**: 新的图表数据
    - **chart_config**: 新的图表配置
    """
    try:
        chart = await chart_service.update_chart(
            db=db,
            chart_id=chart_id,
            data_json=data.data_json,
            source_type=data.source_type.value if data.source_type else None,
            source_block_id=data.source_block_id,
        )
        await db.commit()
        return Chart3DResponse(
            chart_id=chart.id,
            chart_config=chart.chart_config,
            created_at=chart.created_at,
            updated_at=chart.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/by-block/{block_id}",
    response_model=Chart3DResponse,
    responses={204: {"description": "该 chart_3d block 尚未保存独立图表数据"}},
)
async def get_chart_by_block(
    block_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """根据 block_id 获取 3D 图表数据"""
    chart = await chart_service.get_chart_by_block(db, block_id)
    if not chart:
        block = await db.get(DocumentBlock, block_id)
        if not block:
            raise HTTPException(status_code=404, detail="Block 不存在")
        if block.block_type != "chart_3d":
            raise HTTPException(status_code=400, detail="Block 类型不是 chart_3d")
        return Response(status_code=204)

    return Chart3DResponse(
        chart_id=chart.id,
        chart_config={**chart.chart_config, "data": chart.data_json},
        created_at=chart.created_at,
        updated_at=chart.updated_at,
    )


@router.put("/by-block/{block_id}", response_model=Chart3DResponse)
async def save_chart_by_block(
    block_id: uuid.UUID,
    data: Chart3DCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    根据 block_id 保存或更新图表数据（upsert 操作）

    - **document_id**: 文档 ID
    - **data_json**: 图表数据
    - **source_type**: 数据来源类型
    - **source_block_id**: 数据来源 block ID
    """
    try:
        chart = await chart_service.save_chart_by_block(
            db=db,
            block_id=block_id,
            data_json=data.data_json,
            source_type=data.source_type.value,
            source_block_id=data.source_block_id,
        )
        await db.commit()
        return Chart3DResponse(
            chart_id=chart.id,
            chart_config=chart.chart_config,
            created_at=chart.created_at,
            updated_at=chart.updated_at,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

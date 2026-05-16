"""
系统管理路由

提供系统状态查询、日志查看、系统初始化等功能
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from loguru import logger
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import (
    Document,
    DocumentBlock,
    SystemLog,
)
from app.schemas.system import (
    SystemInitResponse,
    SystemLogListResponse,
    SystemLogResponse,
    SystemStatusResponse,
)
from app.utils.logger import log_to_db

router = APIRouter()


@router.get("/status", response_model=SystemStatusResponse, summary="系统状态")
async def get_system_status(db: AsyncSession = Depends(get_db)):
    """
    获取系统运行状态

    返回数据库连接、AI 服务、存储服务状态及文档/block 数量统计
    """
    # 检查数据库连接
    database_connected = False
    document_count = 0
    block_count = 0
    try:
        await db.execute(text("SELECT 1"))
        database_connected = True

        # 统计文档数量
        doc_result = await db.execute(
            select(func.count()).select_from(Document).where(Document.is_deleted == False)
        )
        document_count = doc_result.scalar() or 0

        # 统计 block 数量
        block_result = await db.execute(select(func.count()).select_from(DocumentBlock))
        block_count = block_result.scalar() or 0

    except Exception as e:
        logger.error(f"数据库状态检查失败: {e}")

    # 检查 AI 服务可用性（简单检查配置是否存在）
    from app.config import settings

    ai_service_available = bool(settings.LLM_API_KEY and settings.LLM_BASE_URL)

    # 检查存储服务可用性
    storage_service_available = True
    if settings.FILE_STORAGE_TYPE == "local":
        import os

        storage_service_available = os.path.exists(settings.LOCAL_STORAGE_PATH)

    return SystemStatusResponse(
        database_connected=database_connected,
        ai_service_available=ai_service_available,
        storage_service_available=storage_service_available,
        document_count=document_count,
        block_count=block_count,
    )


@router.get("/logs", response_model=SystemLogListResponse, summary="查看系统日志")
async def get_system_logs(
    log_type: str | None = Query(None, description="按日志类型筛选"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: AsyncSession = Depends(get_db),
):
    """
    查看系统日志

    支持按类型筛选和分页
    """
    # 构建查询
    query = select(SystemLog).order_by(SystemLog.created_at.desc())
    count_query = select(func.count()).select_from(SystemLog)

    if log_type:
        query = query.where(SystemLog.log_type == log_type)
        count_query = count_query.where(SystemLog.log_type == log_type)

    # 获取总数
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # 分页查询
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    logs = result.scalars().all()

    return SystemLogListResponse(
        logs=[SystemLogResponse.model_validate(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/init", response_model=SystemInitResponse, summary="初始化系统")
async def init_system(db: AsyncSession = Depends(get_db)):
    """
    初始化系统

    创建默认文档空间的初始文档和示例数据
    """
    try:
        # 检查是否已有文档
        existing = await db.execute(select(func.count()).select_from(Document))
        doc_count = existing.scalar() or 0
        if doc_count > 0:
            return SystemInitResponse(
                success=True,
                message="系统已初始化，跳过重复初始化",
                documents_created=0,
            )

        # 创建默认文档树
        docs_created = await _create_default_document_tree(db)

        # 记录初始化日志
        await log_to_db(
            db,
            log_type="document_update",
            message=f"系统初始化完成，创建了 {docs_created} 个文档",
            metadata={"documents_created": docs_created},
        )

        await db.commit()

        return SystemInitResponse(
            success=True,
            message="系统初始化成功",
            documents_created=docs_created,
        )

    except Exception as e:
        logger.error(f"系统初始化失败: {e}")
        await log_to_db(
            db,
            log_type="error",
            message=f"系统初始化失败: {str(e)}",
        )
        return SystemInitResponse(
            success=False,
            message=f"初始化失败: {str(e)}",
        )


async def _create_default_document_tree(db: AsyncSession) -> int:
    """创建默认的文档树结构"""
    now = datetime.utcnow()
    created_count = 0

    # 项目总览
    root = Document(
        id=uuid.uuid4(),
        title="项目总览",
        icon="📋",
        path="项目总览",
        sort_order=0,
        created_at=now,
        updated_at=now,
    )
    db.add(root)
    created_count += 1

    # 产品设计
    product = Document(
        id=uuid.uuid4(),
        parent_id=root.id,
        title="产品设计",
        icon="🎨",
        path="项目总览/产品设计",
        sort_order=0,
        created_at=now,
        updated_at=now,
    )
    db.add(product)
    created_count += 1

    for i, (title, icon) in enumerate([
        ("用户需求", "👥"),
        ("功能模块", "🧩"),
        ("Demo 剧本", "🎬"),
    ]):
        doc = Document(
            id=uuid.uuid4(),
            parent_id=product.id,
            title=title,
            icon=icon,
            path=f"项目总览/产品设计/{title}",
            sort_order=i,
            created_at=now,
            updated_at=now,
        )
        db.add(doc)
        created_count += 1

    # 技术实现
    tech = Document(
        id=uuid.uuid4(),
        parent_id=root.id,
        title="技术实现",
        icon="⚙️",
        path="项目总览/技术实现",
        sort_order=1,
        created_at=now,
        updated_at=now,
    )
    db.add(tech)
    created_count += 1

    for i, (title, icon) in enumerate([
        ("前端架构", "🖥️"),
        ("后端架构", "🔧"),
        ("AI 逻辑", "🤖"),
    ]):
        doc = Document(
            id=uuid.uuid4(),
            parent_id=tech.id,
            title=title,
            icon=icon,
            path=f"项目总览/技术实现/{title}",
            sort_order=i,
            created_at=now,
            updated_at=now,
        )
        db.add(doc)
        created_count += 1

    await db.flush()
    return created_count

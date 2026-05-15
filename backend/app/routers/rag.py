"""
RAG 检索 API 路由

提供文档索引、检索、重建索引等接口
"""

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db
from app.schemas.rag import (
    RAGReindexRequest,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGSearchResult,
)
from app.services.rag_service import rag_service

router = APIRouter()


@router.post("/reindex", summary="重建文档索引")
async def reindex_document(
    request: RAGReindexRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    重建指定文档的 RAG 索引

    - 删除该文档的旧索引
    - 重新生成 chunk 和 embedding
    - 更新文档摘要
    """
    try:
        chunk_count = await rag_service.index_document(db, request.document_id)
        return {
            "status": "success",
            "document_id": request.document_id,
            "chunk_count": chunk_count,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"文档索引失败: {e}")
        raise HTTPException(status_code=500, detail=f"索引失败: {str(e)}")


@router.post("/reindex-all", summary="重建全部索引")
async def reindex_all(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    重建所有文档的 RAG 索引（管理用）

    通过后台任务执行，避免请求超时。
    """
    background_tasks.add_task(_reindex_all_task)
    return {
        "status": "accepted",
        "message": "全量索引已开始，将在后台执行",
    }


async def _reindex_all_task():
    """全量索引后台任务"""
    from app.database import async_session_factory

    async with async_session_factory() as db:
        try:
            count = await rag_service.reindex_all(db)
            await db.commit()
            logger.info(f"全量索引后台任务完成: {count} 个文档")
        except Exception as e:
            logger.error(f"全量索引后台任务失败: {e}")
            await db.rollback()


@router.post("/search", summary="检索相关 block", response_model=RAGSearchResponse)
async def search(
    request: RAGSearchRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    检索与查询相关的 block

    使用向量检索 + BM25 检索 + Reranker 重排的混合检索策略。

    - **query**: 搜索查询
    - **scope**: 检索范围（current_document / document_tree / all_workspace）
    - **document_id**: 文档 ID（current_document 和 document_tree 模式需要）
    - **top_k**: 返回结果数量（默认 5）
    """
    scope_value = request.scope.value if hasattr(request.scope, "value") else request.scope

    results = await rag_service.search(
        db=db,
        query=request.query,
        scope=scope_value,
        document_id=request.document_id,
        top_k=request.top_k,
    )

    # 转换为响应格式
    chunks = []
    for r in results:
        chunks.append(RAGSearchResult(
            doc_id=r.get("document_id", uuid.uuid4()),
            block_id=r.get("block_id", uuid.uuid4()),
            block_type=r.get("block_type", "text"),
            score=r.get("score", 0.0),
            content_preview=r.get("chunk_text", "")[:200],
        ))

    return RAGSearchResponse(chunks=chunks)

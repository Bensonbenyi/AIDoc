"""
文档 Service 层

实现文档管理的核心业务逻辑
"""

import uuid

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document
from app.models.document_block import DocumentBlock
from app.schemas.document import DocumentCreate, DocumentUpdate


async def create_document(db: AsyncSession, data: DocumentCreate) -> Document:
    """创建文档"""
    doc_id = uuid.uuid4()

    # 验证父文档存在
    parent_path = ""
    if data.parent_id:
        parent = await db.get(Document, data.parent_id)
        if not parent or parent.is_deleted:
            raise ValueError("父文档不存在")
        parent_path = parent.path

    # 计算 path
    path = data.title if not parent_path else f"{parent_path} / {data.title}"

    # 计算 sort_order：取同级文档最大 sort_order + 1
    stmt = select(func.coalesce(func.max(Document.sort_order), -1.0)).where(
        Document.parent_id == data.parent_id,
        Document.is_deleted == False,  # noqa: E712
    )
    result = await db.execute(stmt)
    max_sort = result.scalar()
    sort_order = float(max_sort) + 1.0

    doc = Document(
        id=doc_id,
        parent_id=data.parent_id,
        title=data.title,
        icon=data.icon,
        path=path,
        sort_order=sort_order,
    )
    db.add(doc)
    await db.flush()
    await db.refresh(doc)
    return doc


async def get_document_tree(db: AsyncSession) -> list[dict]:
    """获取文档树"""
    stmt = (
        select(Document)
        .where(Document.is_deleted == False)  # noqa: E712
        .order_by(Document.sort_order)
    )
    result = await db.execute(stmt)
    all_docs = result.scalars().all()

    # 构建树状结构
    doc_map: dict[uuid.UUID, dict] = {}
    roots: list[dict] = []

    for doc in all_docs:
        node = {
            "id": doc.id,
            "icon": doc.icon,
            "title": doc.title,
            "children": [],
        }
        doc_map[doc.id] = node

    for doc in all_docs:
        node = doc_map[doc.id]
        if doc.parent_id and doc.parent_id in doc_map:
            doc_map[doc.parent_id]["children"].append(node)
        else:
            roots.append(node)

    return roots


async def get_document_detail(db: AsyncSession, document_id: uuid.UUID) -> dict:
    """获取文档详情（包含 blocks）"""
    doc = await db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise ValueError("文档不存在")

    # 获取 blocks
    stmt = (
        select(DocumentBlock)
        .where(DocumentBlock.document_id == document_id)
        .order_by(DocumentBlock.sort_order)
    )
    result = await db.execute(stmt)
    blocks = result.scalars().all()

    return {
        "id": doc.id,
        "title": doc.title,
        "icon": doc.icon,
        "cover_url": doc.cover_url,
        "path": doc.path,
        "blocks": blocks,
    }


async def update_document(
    db: AsyncSession, document_id: uuid.UUID, data: DocumentUpdate
) -> Document:
    """更新文档"""
    doc = await db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise ValueError("文档不存在")

    old_title = doc.title

    # 更新提供的字段
    if data.title is not None:
        doc.title = data.title
    if data.icon is not None:
        doc.icon = data.icon
    if data.cover_url is not None:
        doc.cover_url = data.cover_url

    # 如果 title 改变，同步更新所有子文档的 path
    if data.title is not None and data.title != old_title:
        old_prefix = doc.path
        new_prefix = data.title if not doc.parent_id else None
        if new_prefix is None:
            # 需要从父文档构建新 path
            if doc.parent_id:
                parent = await db.get(Document, doc.parent_id)
                new_prefix = f"{parent.path} / {data.title}" if parent else data.title
            else:
                new_prefix = data.title

        doc.path = new_prefix

        # 递归更新子文档的 path
        await _update_children_paths(db, doc.id, old_prefix, new_prefix)

    await db.flush()
    await db.refresh(doc)
    return doc


async def _update_children_paths(
    db: AsyncSession,
    parent_id: uuid.UUID,
    old_prefix: str,
    new_prefix: str,
) -> None:
    """递归更新子文档的 path"""
    stmt = select(Document).where(
        Document.parent_id == parent_id,
        Document.is_deleted == False,  # noqa: E712
    )
    result = await db.execute(stmt)
    children = result.scalars().all()

    for child in children:
        # 替换 path 前缀
        if child.path.startswith(old_prefix):
            child.path = new_prefix + child.path[len(old_prefix):]
        await _update_children_paths(db, child.id, old_prefix, new_prefix)


async def delete_document(db: AsyncSession, document_id: uuid.UUID) -> bool:
    """软删除文档（包括所有子文档）"""
    doc = await db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise ValueError("文档不存在")

    # 递归软删除子文档
    await _soft_delete_children(db, document_id)

    # 软删除自身
    doc.is_deleted = True
    await db.flush()
    return True


async def _soft_delete_children(db: AsyncSession, parent_id: uuid.UUID) -> None:
    """递归软删除子文档"""
    stmt = select(Document).where(
        Document.parent_id == parent_id,
        Document.is_deleted == False,  # noqa: E712
    )
    result = await db.execute(stmt)
    children = result.scalars().all()

    for child in children:
        child.is_deleted = True
        await _soft_delete_children(db, child.id)


async def get_document_path(db: AsyncSession, document_id: uuid.UUID) -> str:
    """获取文档的完整路径字符串"""
    doc = await db.get(Document, document_id)
    if not doc or doc.is_deleted:
        raise ValueError("文档不存在")
    return doc.path

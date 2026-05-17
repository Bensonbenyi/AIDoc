"""
Block API 测试
"""

import uuid

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.config import settings
from app.models.file_asset import FileAsset
from app.services import file_service


async def _create_doc_with_block(client: AsyncClient):
    """辅助函数：创建文档并添加一个 block"""
    doc = (await client.post("/api/documents", json={"title": "测试文档"})).json()
    block = (
        await client.post(
            f"/api/documents/{doc['id']}/blocks",
            json={
                "block_type": "paragraph",
                "content": {"text": "初始内容"},
                "sort_order": 0,
            },
        )
    ).json()
    return doc, block


@pytest.mark.asyncio
async def test_create_block(client: AsyncClient):
    """测试创建 block"""
    doc = (await client.post("/api/documents", json={"title": "测试"})).json()

    resp = await client.post(
        f"/api/documents/{doc['id']}/blocks",
        json={
            "block_type": "heading_1",
            "content": {"text": "标题"},
            "sort_order": 0,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["block_type"] == "heading_1"
    assert data["content"]["text"] == "标题"
    assert data["document_id"] == doc["id"]


@pytest.mark.asyncio
async def test_create_block_invalid_type(client: AsyncClient):
    """测试创建不合法类型的 block"""
    doc = (await client.post("/api/documents", json={"title": "测试"})).json()

    resp = await client.post(
        f"/api/documents/{doc['id']}/blocks",
        json={
            "block_type": "invalid_type",
            "content": {},
            "sort_order": 0,
        },
    )
    # Pydantic 枚举校验返回 422，service 层校验返回 400
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_update_block(client: AsyncClient):
    """测试更新 block"""
    _, block = await _create_doc_with_block(client)

    resp = await client.patch(
        f"/api/blocks/{block['id']}",
        json={"content": {"text": "更新后的内容"}},
    )
    assert resp.status_code == 200
    assert resp.json()["content"]["text"] == "更新后的内容"


@pytest.mark.asyncio
async def test_update_block_not_found(client: AsyncClient):
    """测试更新不存在的 block"""
    fake_id = str(uuid.uuid4())
    resp = await client.patch(
        f"/api/blocks/{fake_id}",
        json={"content": {"text": "x"}},
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_block(client: AsyncClient):
    """测试删除 block"""
    doc, block = await _create_doc_with_block(client)

    resp = await client.delete(f"/api/blocks/{block['id']}")
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 删除后文档应该没有 blocks
    detail = (await client.get(f"/api/documents/{doc['id']}")).json()
    assert len(detail["blocks"]) == 0


@pytest.mark.asyncio
async def test_delete_block_removes_s3_file_asset(client: AsyncClient, db_session, monkeypatch):
    """删除 block 时同步删除 S3 文件对象和数据库记录。"""
    doc, block = await _create_doc_with_block(client)
    file_id = uuid.uuid4()
    deleted_keys: list[str] = []

    monkeypatch.setattr(settings, "FILE_STORAGE_TYPE", "s3")

    async def fake_delete_from_s3(file_url: str) -> None:
        deleted_keys.append(file_url)

    monkeypatch.setattr(file_service, "_delete_from_s3", fake_delete_from_s3)

    db_session.add(
        FileAsset(
            id=file_id,
            document_id=uuid.UUID(doc["id"]),
            block_id=uuid.UUID(block["id"]),
            file_name="demo.mp4",
            file_type="video/mp4",
            file_url="demo.mp4",
            file_size=123,
        )
    )
    await db_session.commit()

    resp = await client.delete(f"/api/blocks/{block['id']}")
    assert resp.status_code == 200

    result = await db_session.execute(select(FileAsset).where(FileAsset.id == file_id))
    assert result.scalar_one_or_none() is None
    assert deleted_keys == ["demo.mp4"]


@pytest.mark.asyncio
async def test_update_block_removes_replaced_s3_file_asset(client: AsyncClient, db_session, monkeypatch):
    """替换 block fileId 时删除旧 S3 文件，保留新文件。"""
    doc, block = await _create_doc_with_block(client)
    old_file_id = uuid.uuid4()
    new_file_id = uuid.uuid4()
    deleted_keys: list[str] = []

    monkeypatch.setattr(settings, "FILE_STORAGE_TYPE", "s3")

    async def fake_delete_from_s3(file_url: str) -> None:
        deleted_keys.append(file_url)

    monkeypatch.setattr(file_service, "_delete_from_s3", fake_delete_from_s3)

    db_session.add_all(
        [
            FileAsset(
                id=old_file_id,
                document_id=uuid.UUID(doc["id"]),
                block_id=uuid.UUID(block["id"]),
                file_name="old.mp3",
                file_type="audio/mpeg",
                file_url="old.mp3",
                file_size=123,
            ),
            FileAsset(
                id=new_file_id,
                document_id=uuid.UUID(doc["id"]),
                block_id=uuid.UUID(block["id"]),
                file_name="new.mp3",
                file_type="audio/mpeg",
                file_url="new.mp3",
                file_size=456,
            ),
        ]
    )
    await db_session.commit()

    await client.patch(
        f"/api/blocks/{block['id']}",
        json={
            "content": {
                "fileId": str(old_file_id),
                "fileName": "old.mp3",
                "fileUrl": f"/api/files/{old_file_id}",
            }
        },
    )

    resp = await client.patch(
        f"/api/blocks/{block['id']}",
        json={
            "content": {
                "fileId": str(new_file_id),
                "fileName": "new.mp3",
                "fileUrl": f"/api/files/{new_file_id}",
            }
        },
    )
    assert resp.status_code == 200

    old_result = await db_session.execute(select(FileAsset).where(FileAsset.id == old_file_id))
    new_result = await db_session.execute(select(FileAsset).where(FileAsset.id == new_file_id))
    assert old_result.scalar_one_or_none() is None
    assert new_result.scalar_one_or_none() is not None
    assert deleted_keys == ["old.mp3"]


@pytest.mark.asyncio
async def test_delete_block_not_found(client: AsyncClient):
    """测试删除不存在的 block"""
    fake_id = str(uuid.uuid4())
    resp = await client.delete(f"/api/blocks/{fake_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_multiple_blocks_order(client: AsyncClient):
    """测试多个 block 的排序"""
    doc = (await client.post("/api/documents", json={"title": "排序测试"})).json()

    # 创建 3 个 block
    for i in range(3):
        await client.post(
            f"/api/documents/{doc['id']}/blocks",
            json={
                "block_type": "paragraph",
                "content": {"text": f"段落{i}"},
                "sort_order": float(i),
            },
        )

    detail = (await client.get(f"/api/documents/{doc['id']}")).json()
    assert len(detail["blocks"]) == 3
    for i, block in enumerate(detail["blocks"]):
        assert block["content"]["text"] == f"段落{i}"
        assert block["sort_order"] == float(i)

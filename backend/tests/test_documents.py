"""
文档 API 测试
"""

import uuid

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_document(client: AsyncClient):
    """测试创建文档"""
    response = await client.post(
        "/api/documents",
        json={"title": "测试文档", "icon": "📝"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "测试文档"
    assert data["icon"] == "📝"
    assert data["parent_id"] is None
    assert data["path"] == "测试文档"
    assert data["sort_order"] == 0.0
    assert data["is_deleted"] is False


@pytest.mark.asyncio
async def test_create_child_document(client: AsyncClient):
    """测试创建子文档"""
    # 先创建父文档
    parent_resp = await client.post(
        "/api/documents",
        json={"title": "父文档"},
    )
    parent_id = parent_resp.json()["id"]

    # 创建子文档
    child_resp = await client.post(
        "/api/documents",
        json={"title": "子文档", "parent_id": parent_id},
    )
    assert child_resp.status_code == 200
    child = child_resp.json()
    assert child["parent_id"] == parent_id
    assert child["path"] == "父文档 / 子文档"


@pytest.mark.asyncio
async def test_get_document_tree(client: AsyncClient):
    """测试获取文档树"""
    # 创建文档结构：根1 -> 子1，根2
    root1 = (await client.post("/api/documents", json={"title": "根文档1"})).json()
    root2 = (await client.post("/api/documents", json={"title": "根文档2"})).json()
    await client.post(
        "/api/documents",
        json={"title": "子文档1", "parent_id": root1["id"]},
    )

    resp = await client.get("/api/documents/tree")
    assert resp.status_code == 200
    tree = resp.json()
    assert len(tree) == 2

    # 根文档1 应该有 1 个子文档
    r1 = next(n for n in tree if n["title"] == "根文档1")
    assert len(r1["children"]) == 1
    assert r1["children"][0]["title"] == "子文档1"

    # 根文档2 应该没有子文档
    r2 = next(n for n in tree if n["title"] == "根文档2")
    assert len(r2["children"]) == 0


@pytest.mark.asyncio
async def test_get_document_detail(client: AsyncClient):
    """测试获取文档详情"""
    # 创建文档
    doc = (await client.post("/api/documents", json={"title": "详情测试"})).json()
    doc_id = doc["id"]

    # 添加一个 block
    await client.post(
        f"/api/documents/{doc_id}/blocks",
        json={"block_type": "paragraph", "content": {"text": "hello"}, "sort_order": 0},
    )

    # 获取详情
    resp = await client.get(f"/api/documents/{doc_id}")
    assert resp.status_code == 200
    detail = resp.json()
    assert detail["title"] == "详情测试"
    assert len(detail["blocks"]) == 1
    assert detail["blocks"][0]["content"]["text"] == "hello"


@pytest.mark.asyncio
async def test_get_document_not_found(client: AsyncClient):
    """测试获取不存在的文档"""
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"/api/documents/{fake_id}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_update_document(client: AsyncClient):
    """测试更新文档"""
    doc = (await client.post("/api/documents", json={"title": "原标题"})).json()

    resp = await client.patch(
        f"/api/documents/{doc['id']}",
        json={"title": "新标题"},
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "新标题"


@pytest.mark.asyncio
async def test_update_document_title_updates_children_paths(client: AsyncClient):
    """测试更新文档标题时同步更新子文档 path"""
    parent = (await client.post("/api/documents", json={"title": "父"})).json()
    child = (
        await client.post(
            "/api/documents",
            json={"title": "子", "parent_id": parent["id"]},
        )
    ).json()

    # 更新父文档标题
    await client.patch(
        f"/api/documents/{parent['id']}",
        json={"title": "新父"},
    )

    # 验证子文档 path 已更新
    child_detail = (await client.get(f"/api/documents/{child['id']}")).json()
    assert child_detail["path"] == "新父 / 子"


@pytest.mark.asyncio
async def test_delete_document(client: AsyncClient):
    """测试软删除文档"""
    doc = (await client.post("/api/documents", json={"title": "待删除"})).json()

    resp = await client.delete(f"/api/documents/{doc['id']}")
    assert resp.status_code == 200
    assert resp.json()["success"] is True

    # 删除后应无法获取
    resp = await client.get(f"/api/documents/{doc['id']}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_delete_document_cascades_to_children(client: AsyncClient):
    """测试删除文档时级联软删除子文档"""
    parent = (await client.post("/api/documents", json={"title": "父"})).json()
    child = (
        await client.post(
            "/api/documents",
            json={"title": "子", "parent_id": parent["id"]},
        )
    ).json()

    # 删除父文档
    await client.delete(f"/api/documents/{parent['id']}")

    # 子文档也应被删除
    resp = await client.get(f"/api/documents/{child['id']}")
    assert resp.status_code == 404

    # 文档树中不应出现已删除的文档
    tree = (await client.get("/api/documents/tree")).json()
    assert len(tree) == 0


@pytest.mark.asyncio
async def test_batch_save_blocks(client: AsyncClient):
    """测试批量保存 blocks"""
    doc = (await client.post("/api/documents", json={"title": "批量测试"})).json()

    # 批量保存
    blocks = [
        {"block_type": "heading_1", "content": {"text": "标题"}, "sort_order": 0},
        {"block_type": "paragraph", "content": {"text": "段落"}, "sort_order": 1},
    ]
    resp = await client.put(
        f"/api/documents/{doc['id']}/blocks",
        json={"blocks": blocks},
    )
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert resp.json()["updated_count"] == 2

    # 验证 blocks 已保存
    detail = (await client.get(f"/api/documents/{doc['id']}")).json()
    assert len(detail["blocks"]) == 2


@pytest.mark.asyncio
async def test_batch_save_blocks_replaces_old(client: AsyncClient):
    """测试批量保存 blocks 会替换旧的"""
    doc = (await client.post("/api/documents", json={"title": "替换测试"})).json()

    # 第一次保存
    await client.put(
        f"/api/documents/{doc['id']}/blocks",
        json={"blocks": [
            {"block_type": "paragraph", "content": {"text": "旧"}, "sort_order": 0},
        ]},
    )

    # 第二次保存
    await client.put(
        f"/api/documents/{doc['id']}/blocks",
        json={"blocks": [
            {"block_type": "paragraph", "content": {"text": "新1"}, "sort_order": 0},
            {"block_type": "paragraph", "content": {"text": "新2"}, "sort_order": 1},
        ]},
    )

    detail = (await client.get(f"/api/documents/{doc['id']}")).json()
    assert len(detail["blocks"]) == 2
    texts = {b["content"]["text"] for b in detail["blocks"]}
    assert texts == {"新1", "新2"}

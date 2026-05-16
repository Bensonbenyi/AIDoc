"""
3D 图表 API 测试
"""

import uuid

import pytest
from httpx import AsyncClient


async def _create_doc_with_chart_block(client: AsyncClient):
    """辅助函数：创建文档并添加一个 chart_3d block"""
    doc = (await client.post("/api/documents", json={"title": "图表测试"})).json()
    block = (
        await client.post(
            f"/api/documents/{doc['id']}/blocks",
            json={
                "block_type": "chart_3d",
                "content": {
                    "title": "季度数据",
                    "chartType": "bar",
                    "x": ["Q1", "Q2"],
                    "y": [10, 20],
                },
                "sort_order": 0,
            },
        )
    ).json()
    return doc, block


@pytest.mark.asyncio
async def test_get_chart_by_block_without_saved_chart_returns_no_content(
    client: AsyncClient,
):
    """chart_3d block 没有独立图表数据时返回 204，由前端回退到 block.content"""
    _, block = await _create_doc_with_chart_block(client)

    resp = await client.get(f"/api/charts/by-block/{block['id']}")

    assert resp.status_code == 204
    assert resp.content == b""


@pytest.mark.asyncio
async def test_save_and_get_chart_by_block(client: AsyncClient):
    """保存后可根据 block_id 获取图表数据"""
    doc, block = await _create_doc_with_chart_block(client)

    save_resp = await client.put(
        f"/api/charts/by-block/{block['id']}",
        json={
            "document_id": doc["id"],
            "source_type": "manual",
            "data_json": {
                "title": "保存后的数据",
                "chartType": "bar",
                "x": ["A", "B"],
                "y": [1, 2],
            },
        },
    )
    assert save_resp.status_code == 200

    resp = await client.get(f"/api/charts/by-block/{block['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["chart_config"]["data"]["title"] == "保存后的数据"


@pytest.mark.asyncio
async def test_get_chart_by_missing_block_returns_404(client: AsyncClient):
    """不存在的 block 仍然返回 404"""
    resp = await client.get(f"/api/charts/by-block/{uuid.uuid4()}")

    assert resp.status_code == 404


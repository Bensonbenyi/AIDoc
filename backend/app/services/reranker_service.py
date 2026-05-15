"""
Reranker 服务

对 RAG 检索结果进行重排序。
如果配置了 Reranker API（如阿里云 DashScope），调用外部服务重排；
否则使用加权合并策略。
"""

import httpx
from loguru import logger

from app.config import settings


class RerankerService:
    """Reranker 重排序服务"""

    def __init__(self):
        self.api_key = settings.RERANKER_API_KEY
        self.base_url = settings.RERANKER_BASE_URL
        self.model = settings.RERANKER_MODEL
        self.timeout = 15.0

    @property
    def is_available(self) -> bool:
        """检查 Reranker 服务是否已配置"""
        return all([self.api_key, self.base_url, self.model])

    async def rerank(
        self,
        query: str,
        candidates: list[dict],
        top_k: int = 5,
    ) -> list[dict]:
        """
        对候选结果进行重排序

        如果配置了外部 Reranker API，调用该服务；
        否则使用加权合并策略（向量得分 * 0.6 + BM25 得分 * 0.4）。

        Args:
            query: 用户查询
            candidates: 候选结果列表，每项需包含 score 和 chunk_text
            top_k: 返回结果数量

        Returns:
            重排序后的结果列表
        """
        if not candidates:
            return []

        if self.is_available:
            try:
                return await self._rerank_with_api(query, candidates, top_k)
            except Exception as e:
                logger.warning(f"Reranker API 调用失败，降级为加权合并: {e}")
                return self._merge_scores(candidates, top_k)
        else:
            return self._merge_scores(candidates, top_k)

    async def _rerank_with_api(
        self,
        query: str,
        candidates: list[dict],
        top_k: int,
    ) -> list[dict]:
        """
        调用外部 Reranker API 重排序

        使用 OpenAI 兼容的 rerank 接口
        """
        url = f"{self.base_url}/rerank"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        # 构造 reranker 请求
        documents = [c.get("chunk_text", "") for c in candidates]
        payload = {
            "model": self.model,
            "query": query,
            "documents": documents,
            "top_n": top_k,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        # 解析重排序结果
        results = []
        for item in data.get("results", []):
            idx = item.get("index", 0)
            relevance_score = item.get("relevance_score", 0.0)
            if 0 <= idx < len(candidates):
                candidate = candidates[idx].copy()
                candidate["rerank_score"] = relevance_score
                candidate["score"] = relevance_score
                results.append(candidate)

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

    def _merge_scores(self, candidates: list[dict], top_k: int) -> list[dict]:
        """
        加权合并策略

        对同时出现在向量检索和 BM25 检索结果中的 chunk，
        使用加权公式：vector_score * 0.6 + bm25_score * 0.4。

        对于只有单一来源的 chunk，保留原始分数。

        Args:
            candidates: 候选结果列表，每项包含 source 字段（"vector" 或 "bm25"）
            top_k: 返回结果数量

        Returns:
            合并排序后的结果列表
        """
        # 按 block_id 分组，合并分数
        merged: dict[str, dict] = {}

        for candidate in candidates:
            block_id = str(candidate.get("block_id", ""))
            source = candidate.get("source", "unknown")
            score = candidate.get("score", 0.0)

            if block_id in merged:
                existing = merged[block_id]
                if source == "vector":
                    existing["vector_score"] = score
                elif source == "bm25":
                    existing["bm25_score"] = score
                # 更新总分
                existing["score"] = (
                    existing.get("vector_score", 0.0) * 0.6
                    + existing.get("bm25_score", 0.0) * 0.4
                )
            else:
                merged[block_id] = candidate.copy()
                if source == "vector":
                    merged[block_id]["vector_score"] = score
                    merged[block_id]["bm25_score"] = 0.0
                elif source == "bm25":
                    merged[block_id]["vector_score"] = 0.0
                    merged[block_id]["bm25_score"] = score
                merged[block_id]["score"] = score

        # 排序并返回 top_k
        results = sorted(merged.values(), key=lambda x: x["score"], reverse=True)
        return results[:top_k]


# 全局单例
reranker_service = RerankerService()

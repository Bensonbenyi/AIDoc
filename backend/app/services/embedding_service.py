"""
Embedding Service

封装阿里 Qwen text-embedding-v4 API 调用，生成文本向量。
"""

import httpx
from loguru import logger

from app.config import settings


class EmbeddingService:
    """Embedding 服务类，封装向量生成逻辑"""

    # DashScope API 单次最大文本数
    MAX_BATCH_SIZE = 10

    def __init__(self):
        self.api_key = settings.EMBEDDING_API_KEY
        self.base_url = settings.EMBEDDING_BASE_URL
        self.model = settings.EMBEDDING_MODEL
        self.timeout = 30.0

    async def embed_text(self, text: str) -> list[float]:
        """
        将单段文本转换为向量

        Args:
            text: 待向量化的文本

        Returns:
            1024 维浮点数组

        Raises:
            RuntimeError: API 调用失败时抛出
        """
        results = await self.embed_batch([text])
        return results[0]

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """
        批量生成向量

        自动处理 API 的批量限制，分批调用后合并结果。

        Args:
            texts: 待向量化的文本列表

        Returns:
            向量列表，与输入文本一一对应

        Raises:
            RuntimeError: API 调用失败时抛出
        """
        if not texts:
            return []

        # 过滤空文本
        valid_texts = [t if t.strip() else " " for t in texts]

        # 分批处理
        all_embeddings = []
        for i in range(0, len(valid_texts), self.MAX_BATCH_SIZE):
            batch = valid_texts[i : i + self.MAX_BATCH_SIZE]
            batch_embeddings = await self._call_embedding_api(batch)
            all_embeddings.extend(batch_embeddings)

        return all_embeddings

    async def _call_embedding_api(self, texts: list[str]) -> list[list[float]]:
        """
        调用 Embedding API

        使用 OpenAI 兼容的 Embeddings 接口（DashScope compatible mode）

        Args:
            texts: 文本列表

        Returns:
            向量列表

        Raises:
            RuntimeError: API 调用失败
        """
        url = f"{self.base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "input": texts,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()

            # 解析响应（OpenAI 兼容格式）
            embeddings = []
            for item in data.get("data", []):
                embedding = item.get("embedding", [])
                embeddings.append(embedding)

            if len(embeddings) != len(texts):
                raise RuntimeError(
                    f"Embedding API 返回数量不匹配: 期望 {len(texts)}, 实际 {len(embeddings)}"
                )

            logger.debug(f"Embedding 生成成功: {len(texts)} 条文本")
            return embeddings

        except httpx.HTTPStatusError as e:
            logger.error(f"Embedding API HTTP 错误: {e.response.status_code} - {e.response.text}")
            raise RuntimeError(f"Embedding API 调用失败: {e.response.status_code}") from e
        except httpx.RequestError as e:
            logger.error(f"Embedding API 请求错误: {e}")
            raise RuntimeError(f"Embedding API 请求失败: {e}") from e
        except Exception as e:
            logger.error(f"Embedding API 未知错误: {e}")
            raise RuntimeError(f"Embedding 生成失败: {e}") from e


# 全局单例
embedding_service = EmbeddingService()

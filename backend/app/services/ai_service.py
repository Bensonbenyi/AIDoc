"""
AI Service 层

封装 LLM 调用逻辑，支持智谱 AI GLM-5.1 API
"""

import json
import uuid
from pathlib import Path
from typing import AsyncGenerator

import httpx
from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.ai_chat import AIChatSession
from app.models.ai_message import AIMessage

# Prompt 模板目录
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def load_prompt(name: str) -> str:
    """加载 prompt 模板文件"""
    path = PROMPTS_DIR / f"{name}.txt"
    if path.exists():
        return path.read_text(encoding="utf-8")
    logger.warning(f"Prompt 模板不存在: {path}")
    return ""


class AIService:
    """AI 服务类，封装 LLM 调用逻辑"""

    def __init__(self):
        self.api_key = settings.LLM_API_KEY
        self.base_url = settings.LLM_BASE_URL
        self.model = settings.LLM_MODEL
        self.timeout = 60.0

    async def _call_llm(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        """
        调用 LLM API（智谱 AI GLM-5.1）

        使用 OpenAI 兼容的 Chat Completions 接口
        """
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        # 提取回答内容
        content = data["choices"][0]["message"]["content"]
        return content

    async def _stream_llm(
        self,
        messages: list[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> AsyncGenerator[str, None]:
        """
        流式调用 LLM API

        使用 SSE (Server-Sent Events) 流式返回
        """
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
            "stream": True,
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            async with client.stream("POST", url, json=payload, headers=headers) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            if content:
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue

    def _build_chat_messages(
        self,
        user_message: str,
        history: list[AIMessage] | None = None,
        context: str | None = None,
    ) -> list[dict]:
        """
        构造发送给 LLM 的消息列表

        Args:
            user_message: 用户消息
            history: 历史消息列表
            context: 文档上下文
        """
        messages = []

        # System prompt
        if context:
            system_prompt = load_prompt("document_qa_system")
            full_system = system_prompt + "\n\n" + context
            messages.append({"role": "system", "content": full_system})
            logger.info(f"使用文档问答 prompt, context 长度={len(context)}, system 总长度={len(full_system)}")
        else:
            system_prompt = load_prompt("general_chat_system")
            messages.append({"role": "system", "content": system_prompt})
            logger.info("使用通用对话 prompt（无 context）")

        # 历史消息
        if history:
            for msg in history:
                messages.append({
                    "role": "user" if msg.role == "user" else "assistant",
                    "content": msg.content,
                })

        # 当前用户消息
        messages.append({"role": "user", "content": user_message})

        return messages

    def _parse_ai_response(self, raw_response: str) -> dict:
        """
        解析 LLM 返回的 JSON 格式响应

        尝试从响应中提取 JSON，如果失败则将整个响应作为 answer
        """
        # 尝试提取 JSON 块
        json_start = raw_response.find("{")
        json_end = raw_response.rfind("}") + 1
        if json_start != -1 and json_end > json_start:
            try:
                parsed = json.loads(raw_response[json_start:json_end])
                return {
                    "answer": parsed.get("answer", raw_response),
                    "confidence": parsed.get("confidence", "medium"),
                    "reason": parsed.get("reason", ""),
                    "references": parsed.get("references", []),
                }
            except json.JSONDecodeError:
                pass

        # JSON 解析失败，将整个响应作为 answer
        return {
            "answer": raw_response,
            "confidence": "medium",
            "reason": "无法解析结构化响应",
            "references": [],
        }

    async def chat(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        message: str,
        context: str | None = None,
    ) -> dict:
        """
        普通 AI 对话

        Args:
            db: 数据库会话
            session_id: 对话会话 ID
            message: 用户消息
            context: 文档上下文（可选，用于文档问答）

        Returns:
            包含 answer, references, confidence 的字典
        """
        # 获取历史消息（最近 20 条）
        stmt = (
            select(AIMessage)
            .where(AIMessage.session_id == session_id)
            .order_by(AIMessage.created_at.desc())
            .limit(20)
        )
        result = await db.execute(stmt)
        history = list(reversed(result.scalars().all()))

        # 构造消息列表
        messages = self._build_chat_messages(message, history, context)

        # 调用 LLM
        logger.info(f"调用 LLM: session={session_id}, message_len={len(message)}, has_context={context is not None}")
        raw_response = await self._call_llm(messages)

        # 解析响应
        parsed = self._parse_ai_response(raw_response)

        # 保存用户消息到数据库
        user_msg = AIMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="user",
            content=message,
        )
        db.add(user_msg)

        # 保存 AI 回答到数据库
        ai_msg = AIMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="assistant",
            content=parsed["answer"],
            references=parsed.get("references") or None,
        )
        db.add(ai_msg)

        await db.commit()
        await db.refresh(ai_msg)

        logger.info(f"AI 对话完成: message_id={ai_msg.id}, confidence={parsed.get('confidence')}")

        return {
            "message_id": ai_msg.id,
            "answer": parsed["answer"],
            "references": parsed.get("references", []),
            "confidence": parsed.get("confidence"),
        }

    async def stream_chat(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        message: str,
        context: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        流式 AI 对话

        Yields SSE 格式的数据块
        """
        # 获取历史消息
        stmt = (
            select(AIMessage)
            .where(AIMessage.session_id == session_id)
            .order_by(AIMessage.created_at.desc())
            .limit(20)
        )
        result = await db.execute(stmt)
        history = list(reversed(result.scalars().all()))

        # 构造消息列表
        messages = self._build_chat_messages(message, history, context)

        # 保存用户消息
        user_msg = AIMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="user",
            content=message,
        )
        db.add(user_msg)
        await db.commit()

        # 流式调用 LLM 并收集完整回答
        full_answer = ""
        async for chunk in self._stream_llm(messages):
            full_answer += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk}, ensure_ascii=False)}\n\n"

        # 保存 AI 回答
        ai_msg = AIMessage(
            id=uuid.uuid4(),
            session_id=session_id,
            role="assistant",
            content=full_answer,
        )
        db.add(ai_msg)
        await db.commit()
        await db.refresh(ai_msg)

        # 发送完成信号
        yield f"data: {json.dumps({'type': 'done', 'message_id': str(ai_msg.id)}, ensure_ascii=False)}\n\n"

    async def create_session(
        self,
        db: AsyncSession,
        document_id: uuid.UUID | None = None,
        title: str = "新对话",
    ) -> AIChatSession:
        """创建新的对话会话"""
        session = AIChatSession(
            id=uuid.uuid4(),
            document_id=document_id,
            title=title,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        logger.info(f"创建 AI 对话会话: session_id={session.id}")
        return session

    async def get_session(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
    ) -> AIChatSession | None:
        """获取对话会话"""
        stmt = select(AIChatSession).where(AIChatSession.id == session_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_messages(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        limit: int = 50,
    ) -> list[AIMessage]:
        """获取对话历史消息"""
        stmt = (
            select(AIMessage)
            .where(AIMessage.session_id == session_id)
            .order_by(AIMessage.created_at.asc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    async def get_sessions_by_document(
        self,
        db: AsyncSession,
        document_id: uuid.UUID,
    ) -> list[AIChatSession]:
        """获取指定文档的所有对话会话"""
        stmt = (
            select(AIChatSession)
            .where(AIChatSession.document_id == document_id)
            .order_by(AIChatSession.updated_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())


# 全局单例
ai_service = AIService()

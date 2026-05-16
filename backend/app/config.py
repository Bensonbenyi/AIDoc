"""
应用配置模块

使用 pydantic-settings 从环境变量和 .env 文件加载配置
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """应用配置类"""

    # 数据库配置
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/aidoc",
        description="PostgreSQL 数据库连接地址"
    )

    # 前端/后端地址
    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        description="前端地址（用于 CORS 配置）"
    )
    BACKEND_URL: str = Field(
        default="http://localhost:8000",
        description="后端地址"
    )

    # LLM 服务配置（智谱 AI GLM-5.1）
    LLM_API_KEY: str = Field(
        default="your_zhipuai_api_key_here",
        description="智谱 AI API Key"
    )
    LLM_BASE_URL: str = Field(
        default="https://open.bigmodel.cn/api/paas/v4",
        description="LLM 服务地址"
    )
    LLM_MODEL: str = Field(
        default="glm-5.1",
        description="使用的 LLM 模型名"
    )

    # Redis 配置（可选）
    REDIS_URL: Optional[str] = Field(
        default=None,
        description="Redis 地址（可选）"
    )

    # 文件存储配置
    FILE_STORAGE_TYPE: str = Field(
        default="local",
        description="文件存储类型: local / s3 / oss"
    )
    LOCAL_STORAGE_PATH: str = Field(
        default="./storage",
        description="本地文件存储路径"
    )
    S3_BUCKET: Optional[str] = Field(
        default=None,
        description="S3 bucket 名称"
    )
    S3_ACCESS_KEY: Optional[str] = Field(
        default=None,
        description="S3 Access Key"
    )
    S3_SECRET_KEY: Optional[str] = Field(
        default=None,
        description="S3 Secret Key"
    )

    # 代码执行配置
    CODE_EXECUTION_MODE: str = Field(
        default="docker",
        description="代码执行模式: docker / pyodide"
    )
    CODE_EXECUTION_TIMEOUT: int = Field(
        default=30,
        description="代码执行超时时间（秒）"
    )
    DOCKER_IMAGE: str = Field(
        default="aidoc-python-runner",
        description="代码执行 Docker 镜像名称"
    )
    DOCKER_MEMORY_LIMIT: str = Field(
        default="256m",
        description="Docker 容器内存限制"
    )
    DOCKER_CPU_LIMIT: float = Field(
        default=0.5,
        description="Docker 容器 CPU 限制（核数）"
    )

    # 日志配置
    LOG_LEVEL: str = Field(
        default="INFO",
        description="日志等级: DEBUG / INFO / WARNING / ERROR / CRITICAL"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True,
    }


# 创建全局配置实例
settings = Settings()

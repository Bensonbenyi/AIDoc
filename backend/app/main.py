"""
FastAPI 应用主模块

创建 FastAPI 应用实例，配置 CORS，挂载路由，添加启动事件
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from loguru import logger
import sys

from app.config import settings
from app.database import init_db


# 配置 loguru 日志
logger.remove()  # 移除默认的 stderr handler
logger.add(
    sys.stdout,
    level=settings.LOG_LEVEL,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
    colorize=True,
)
logger.add(
    "logs/app.log",
    level=settings.LOG_LEVEL,
    format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
    rotation="10 MB",  # 日志文件大小超过 10MB 时轮转
    retention="7 days",  # 保留 7 天的日志
    compression="zip",  # 压缩旧日志
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    应用生命周期管理

    启动时初始化数据库，关闭时清理资源
    """
    # 启动时执行
    logger.info("正在启动 AIDoc 后端服务...")
    logger.info(f"数据库地址: {settings.DATABASE_URL}")
    logger.info(f"前端地址: {settings.FRONTEND_URL}")
    logger.info(f"LLM 模型: {settings.LLM_MODEL}")
    logger.info(f"Embedding 模型: {settings.EMBEDDING_MODEL}")
    logger.info(f"文件存储类型: {settings.FILE_STORAGE_TYPE}")
    logger.info(f"代码执行模式: {settings.CODE_EXECUTION_MODE}")
    logger.info(f"日志等级: {settings.LOG_LEVEL}")

    # 初始化数据库（创建表）
    try:
        await init_db()
        logger.info("数据库初始化成功")
    except Exception as e:
        logger.error(f"数据库初始化失败: {e}")
        raise

    yield  # 应用运行期间

    # 关闭时执行
    logger.info("正在关闭 AIDoc 后端服务...")


# 创建 FastAPI 应用实例
app = FastAPI(
    title="AIDoc API",
    description="AI 原生交互式文档系统 API",
    version="0.1.0",
    docs_url="/docs",  # Swagger UI 地址
    redoc_url="/redoc",  # ReDoc 地址
    lifespan=lifespan,
)

# 配置 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],  # 允许前端地址跨域
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
)


@app.get("/api/health", tags=["系统"])
async def health_check():
    """
    健康检查接口

    返回服务状态
    """
    return {
        "status": "healthy",
        "service": "AIDoc API",
        "version": "0.1.0",
    }


@app.get("/", tags=["系统"])
async def root():
    """
    根路径

    返回欢迎信息
    """
    return {
        "message": "欢迎使用 AIDoc API",
        "docs": "/docs",
        "health": "/api/health",
    }


# 注册路由
from app.routers import documents, blocks  # noqa: E402

app.include_router(documents.router, prefix="/api/documents", tags=["文档管理"])
app.include_router(blocks.router, prefix="/api/blocks", tags=["Block 管理"])

# 后续阶段添加的路由：
# from app.routers import ai, rag, code_execution, charts, files, system
# app.include_router(ai.router, prefix="/api/ai", tags=["AI 对话"])
# app.include_router(rag.router, prefix="/api/rag", tags=["RAG 检索"])
# app.include_router(code_execution.router, prefix="/api/code-executions", tags=["代码执行"])
# app.include_router(charts.router, prefix="/api/charts", tags=["3D 图表"])
# app.include_router(files.router, prefix="/api/files", tags=["文件管理"])
# app.include_router(system.router, prefix="/api/system", tags=["系统管理"])

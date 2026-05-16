FROM python:3.11-slim

WORKDIR /app

# 安装 uv 包管理器
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 复制依赖文件
COPY pyproject.toml uv.lock ./

# 安装生产依赖（不装 dev 依赖）
RUN uv sync --frozen --no-dev

# 复制应用代码
COPY app/ ./app/

# 创建必要目录
RUN mkdir -p logs storage

# 暴露端口
EXPOSE 8000

# 启动 FastAPI 应用（Render 会注入 PORT）
CMD ["sh", "-c", "uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

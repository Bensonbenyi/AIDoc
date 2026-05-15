"""
Docker 代码执行服务

在 Docker 容器中安全执行用户提交的 Python 代码
"""

import asyncio
import time

import docker
from docker.errors import ContainerError, ImageNotFound, APIError
from loguru import logger

from app.config import settings


def _run_in_container(code: str, timeout: int) -> dict:
    """在 Docker 容器中执行 Python 代码（同步函数，需在线程中调用）"""
    client = docker.from_env()
    start_time = time.time()

    try:
        container = client.containers.run(
            image=settings.DOCKER_IMAGE,
            command=["python3", "-c", code],
            detach=True,
            network_disabled=True,
            mem_limit=settings.DOCKER_MEMORY_LIMIT,
            cpu_period=100000,
            cpu_quota=int(settings.DOCKER_CPU_LIMIT * 100000),
            stderr=True,
            stdout=True,
        )

        try:
            result = container.wait(timeout=timeout)
            stdout = container.logs(stdout=True, stderr=False).decode("utf-8", errors="replace")
            stderr = container.logs(stdout=False, stderr=True).decode("utf-8", errors="replace")
            exit_code = result.get("StatusCode", 1)

            execution_time_ms = int((time.time() - start_time) * 1000)

            return {
                "status": "success" if exit_code == 0 else "error",
                "stdout": stdout.rstrip("\n"),
                "stderr": stderr.rstrip("\n"),
                "execution_time_ms": execution_time_ms,
            }
        finally:
            container.remove(force=True)

    except ImageNotFound:
        return {
            "status": "error",
            "stdout": "",
            "stderr": f"Docker 镜像 '{settings.DOCKER_IMAGE}' 不存在，请先构建镜像",
            "execution_time_ms": int((time.time() - start_time) * 1000),
        }
    except ContainerError as e:
        execution_time_ms = int((time.time() - start_time) * 1000)
        return {
            "status": "error",
            "stdout": "",
            "stderr": str(e),
            "execution_time_ms": execution_time_ms,
        }
    except APIError as e:
        return {
            "status": "error",
            "stdout": "",
            "stderr": f"Docker API 错误: {e}",
            "execution_time_ms": int((time.time() - start_time) * 1000),
        }
    except Exception as e:
        return {
            "status": "error",
            "stdout": "",
            "stderr": f"执行失败: {e}",
            "execution_time_ms": int((time.time() - start_time) * 1000),
        }


async def execute_code(code: str, timeout: int | None = None) -> dict:
    """
    异步执行 Python 代码

    Args:
        code: Python 源代码
        timeout: 超时时间（秒），默认使用配置值

    Returns:
        执行结果字典：{status, stdout, stderr, execution_time_ms}
    """
    if timeout is None:
        timeout = settings.CODE_EXECUTION_TIMEOUT

    logger.info(f"执行代码（长度={len(code)}, 超时={timeout}s）")

    result = await asyncio.to_thread(_run_in_container, code, timeout)

    logger.info(f"执行完成: status={result['status']}, time={result['execution_time_ms']}ms")
    return result

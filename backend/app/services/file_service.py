"""
文件存储 Service

支持 local / s3 / oss 三种存储方式
"""

import uuid
from pathlib import Path
from datetime import datetime, timezone

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.models.file_asset import FileAsset
from app.models.document_block import DocumentBlock
from app.config import settings


# 文件大小限制（字节）
FILE_SIZE_LIMITS = {
    "image": 10 * 1024 * 1024,      # 10MB
    "audio": 50 * 1024 * 1024,      # 50MB
    "video": 200 * 1024 * 1024,     # 200MB
    "default": 50 * 1024 * 1024,    # 50MB
}


def get_file_size_limit(content_type: str) -> int:
    """根据文件 MIME 类型获取大小限制"""
    if content_type.startswith("image/"):
        return FILE_SIZE_LIMITS["image"]
    if content_type.startswith("audio/"):
        return FILE_SIZE_LIMITS["audio"]
    if content_type.startswith("video/"):
        return FILE_SIZE_LIMITS["video"]
    return FILE_SIZE_LIMITS["default"]


def generate_unique_filename(original_filename: str) -> str:
    """生成唯一文件名，保留原始扩展名"""
    ext = Path(original_filename).suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return unique_name


async def upload_file(
    db: AsyncSession,
    file: UploadFile,
    document_id: uuid.UUID,
    block_id: uuid.UUID | None = None,
) -> FileAsset:
    """
    上传文件

    1. 校验文件大小
    2. 生成唯一文件名
    3. 保存文件到存储
    4. 创建 FileAsset 数据库记录
    """
    # 读取文件内容
    content = await file.read()
    file_size = len(content)

    # 校验文件大小
    limit = get_file_size_limit(file.content_type or "")
    if file_size > limit:
        raise ValueError(f"文件大小超过限制: {file_size} > {limit} 字节")

    # 生成唯一文件名
    unique_name = generate_unique_filename(file.filename or "unnamed")

    # 验证 block_id 是否存在（避免外键约束错误）
    if block_id is not None:
        result = await db.execute(select(DocumentBlock.id).where(DocumentBlock.id == block_id))
        if result.scalar_one_or_none() is None:
            logger.warning(f"block_id {block_id} 不存在，将不关联 block")
            block_id = None

    # 根据存储类型保存文件
    storage_type = settings.FILE_STORAGE_TYPE

    if storage_type == "local":
        file_url = await _save_to_local(content, unique_name)
    elif storage_type == "s3":
        file_url = await _save_to_s3(content, unique_name, file.content_type)
    elif storage_type == "oss":
        file_url = await _save_to_oss(content, unique_name, file.content_type)
    else:
        raise ValueError(f"不支持的存储类型: {storage_type}")

    # 创建数据库记录
    file_asset = FileAsset(
        id=uuid.uuid4(),
        document_id=document_id,
        block_id=block_id,
        file_name=file.filename or "unnamed",
        file_type=file.content_type or "application/octet-stream",
        file_url=file_url,
        file_size=file_size,
        created_at=datetime.utcnow(),
    )

    db.add(file_asset)
    await db.commit()
    await db.refresh(file_asset)

    logger.info(f"文件上传成功: {file_asset.id} ({file.filename}, {file_size} bytes)")
    return file_asset


async def get_file_url(db: AsyncSession, file_id: uuid.UUID) -> str:
    """
    获取文件访问 URL

    本地存储返回 API URL
    S3/OSS 返回签名 URL
    """
    result = await db.execute(select(FileAsset).where(FileAsset.id == file_id))
    file_asset = result.scalar_one_or_none()

    if not file_asset:
        raise FileNotFoundError(f"文件不存在: {file_id}")

    storage_type = settings.FILE_STORAGE_TYPE

    if storage_type == "local":
        # 本地存储返回 API URL
        return f"/api/files/{file_id}"
    elif storage_type == "s3":
        return await _get_s3_signed_url(file_asset.file_url)
    elif storage_type == "oss":
        return await _get_oss_signed_url(file_asset.file_url)
    else:
        return file_asset.file_url


async def get_file_path(db: AsyncSession, file_id: uuid.UUID) -> tuple[Path, FileAsset]:
    """
    获取本地文件路径（仅用于 local 存储）

    返回 (文件路径, FileAsset 记录)
    """
    result = await db.execute(select(FileAsset).where(FileAsset.id == file_id))
    file_asset = result.scalar_one_or_none()

    if not file_asset:
        raise FileNotFoundError(f"文件不存在: {file_id}")

    # 本地存储的 file_url 字段存储的是文件名
    file_path = Path(settings.LOCAL_STORAGE_PATH) / file_asset.file_url

    return file_path, file_asset


async def delete_file(db: AsyncSession, file_id: uuid.UUID) -> None:
    """
    删除文件

    1. 删除存储中的文件
    2. 删除数据库记录
    """
    result = await db.execute(select(FileAsset).where(FileAsset.id == file_id))
    file_asset = result.scalar_one_or_none()

    if not file_asset:
        raise FileNotFoundError(f"文件不存在: {file_id}")

    storage_type = settings.FILE_STORAGE_TYPE

    # 删除存储中的文件
    if storage_type == "local":
        filename = Path(file_asset.file_url).name
        file_path = Path(settings.LOCAL_STORAGE_PATH) / filename
        if file_path.exists():
            file_path.unlink()
            logger.info(f"本地文件已删除: {file_path}")
    elif storage_type == "s3":
        await _delete_from_s3(file_asset.file_url)
    elif storage_type == "oss":
        await _delete_from_oss(file_asset.file_url)

    # 删除数据库记录
    await db.delete(file_asset)
    await db.commit()

    logger.info(f"文件记录已删除: {file_id}")


# ==============================
# 本地存储实现
# ==============================

async def _save_to_local(content: bytes, filename: str) -> str:
    """保存文件到本地存储"""
    storage_path = Path(settings.LOCAL_STORAGE_PATH)
    storage_path.mkdir(parents=True, exist_ok=True)

    file_path = storage_path / filename
    file_path.write_bytes(content)

    logger.info(f"文件已保存到本地: {file_path}")
    return filename  # 返回文件名，URL 通过 get_file_url 生成


# ==============================
# S3 存储实现（兼容 Supabase Storage）
# ==============================

def _get_s3_client():
    """获取 S3 客户端"""
    import boto3
    from botocore.config import Config

    kwargs = {
        "aws_access_key_id": settings.S3_ACCESS_KEY,
        "aws_secret_access_key": settings.S3_SECRET_KEY,
        "region_name": settings.S3_REGION,
        "config": Config(s3={"addressing_style": "path"}),
    }
    if settings.S3_ENDPOINT:
        kwargs["endpoint_url"] = settings.S3_ENDPOINT
    return boto3.client("s3", **kwargs)


async def _save_to_s3(content: bytes, filename: str, content_type: str | None) -> str:
    """保存文件到 S3"""
    import asyncio

    def _upload():
        client = _get_s3_client()
        extra_args = {}
        if content_type:
            extra_args["ContentType"] = content_type
        client.put_object(
            Bucket=settings.S3_BUCKET,
            Key=filename,
            Body=content,
            **extra_args,
        )

    await asyncio.to_thread(_upload)
    logger.info(f"文件已上传到 S3: {filename}")
    return filename


async def _get_s3_signed_url(file_url: str) -> str:
    """获取 S3 签名 URL"""
    import asyncio

    def _get_url():
        client = _get_s3_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": file_url},
            ExpiresIn=3600,  # 1 小时有效期
        )

    url = await asyncio.to_thread(_get_url)
    return url


async def _delete_from_s3(file_url: str) -> None:
    """从 S3 删除文件"""
    import asyncio

    def _delete():
        client = _get_s3_client()
        client.delete_object(Bucket=settings.S3_BUCKET, Key=file_url)

    await asyncio.to_thread(_delete)
    logger.info(f"文件已从 S3 删除: {file_url}")


# ==============================
# OSS 存储实现（占位）
# ==============================

async def _save_to_oss(content: bytes, filename: str, content_type: str | None) -> str:
    """保存文件到阿里云 OSS（待实现）"""
    # TODO: 实现 OSS 上传
    raise NotImplementedError("OSS 存储尚未实现")


async def _get_oss_signed_url(file_url: str) -> str:
    """获取 OSS 签名 URL（待实现）"""
    raise NotImplementedError("OSS 存储尚未实现")


async def _delete_from_oss(file_url: str) -> None:
    """从 OSS 删除文件（待实现）"""
    raise NotImplementedError("OSS 存储尚未实现")

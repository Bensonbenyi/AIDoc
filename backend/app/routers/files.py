"""
文件管理 API 路由
"""

import uuid
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, Header, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from loguru import logger

from app.config import settings
from app.dependencies import get_db
from app.schemas.file import FileUploadResponse
from app.services import file_service

router = APIRouter()


@router.post("/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    document_id: str = Form(...),
    block_id: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    上传文件

    - 接收 multipart/form-data
    - 文件大小限制：图片 10MB，音频 50MB，视频 200MB，其他 50MB
    """
    try:
        doc_uuid = uuid.UUID(document_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 document_id")

    block_uuid = None
    if block_id:
        try:
            block_uuid = uuid.UUID(block_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="无效的 block_id")

    try:
        file_asset = await file_service.upload_file(
            db=db,
            file=file,
            document_id=doc_uuid,
            block_id=block_uuid,
        )
        await db.commit()
        return file_asset
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"文件上传失败: {e}")
        raise HTTPException(status_code=500, detail="文件上传失败")


@router.get("/{file_id}")
async def get_file(
    file_id: str,
    range_header: str | None = Header(None, alias="Range"),
    db: AsyncSession = Depends(get_db),
):
    """
    获取文件

    本地存储：返回文件内容
    S3/OSS：重定向到签名 URL
    """
    try:
        file_uuid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 file_id")

    try:
        if settings.FILE_STORAGE_TYPE == "s3":
            file_asset = await file_service.get_file_asset(db, file_uuid)
            s3_object = await file_service.open_s3_object(file_asset, range_header)
            body = s3_object["Body"]

            def iter_file():
                try:
                    for chunk in iter(lambda: body.read(1024 * 1024), b""):
                        yield chunk
                finally:
                    body.close()

            headers = {
                "Accept-Ranges": "bytes",
                "Content-Length": str(s3_object.get("ContentLength", file_asset.file_size)),
                "Content-Disposition": f"inline; filename*=UTF-8''{quote(file_asset.file_name)}",
            }
            if content_range := s3_object.get("ContentRange"):
                headers["Content-Range"] = content_range

            return StreamingResponse(
                iter_file(),
                status_code=206 if "Content-Range" in headers else 200,
                media_type=file_asset.file_type,
                headers=headers,
            )

        if settings.FILE_STORAGE_TYPE == "oss":
            signed_url = await file_service.get_file_url(db, file_uuid)
            return RedirectResponse(url=signed_url)

        file_path, file_asset = await file_service.get_file_path(db, file_uuid)
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="文件不存在")

        return FileResponse(
            path=str(file_path),
            media_type=file_asset.file_type,
            filename=file_asset.file_name,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="文件不存在")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取文件失败: {e}")
        raise HTTPException(status_code=500, detail="获取文件失败")


@router.delete("/{file_id}")
async def delete_file(
    file_id: str,
    db: AsyncSession = Depends(get_db),
):
    """删除文件"""
    try:
        file_uuid = uuid.UUID(file_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="无效的 file_id")

    try:
        await file_service.delete_file(db, file_uuid)
        await db.commit()
        return {"success": True}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="文件不存在")
    except Exception as e:
        logger.error(f"删除文件失败: {e}")
        raise HTTPException(status_code=500, detail="删除文件失败")

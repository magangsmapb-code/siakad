from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from pydantic import BaseModel, Field

from app.api.deps import require_roles
from app.api.routes.foundation import limiter as api_limiter
from app.api.routes.questions import TEACHER_OR_DEVELOPER
from app.core.config import get_settings
from app.schemas.common import ApiResponse
from app.schemas.users import UserRole
from app.services.materials import validate_material_file
from app.services.supabase import create_storage_signed_url, delete_storage_object, select_rows, upload_storage_object

router = APIRouter(prefix="/api")
TEACHER_ONLY = require_roles(UserRole.GURU)
ANY_ROLE = require_roles(*UserRole)


class ImageUploadResult(BaseModel):
    image_path: str
    file_name: str
    file_mime_type: str
    file_size_bytes: int


class ImagePathInput(BaseModel):
    image_path: str = Field(min_length=1, max_length=500)


@router.post("/question-images", response_model=ApiResponse[ImageUploadResult], status_code=status.HTTP_201_CREATED)
@api_limiter.limit(get_settings().api_rate_limit)
async def upload_question_image(
    request: Request,
    profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)],
    file: UploadFile = File(),
) -> ApiResponse[ImageUploadResult]:
    max_size = min(10 * 1024 * 1024, get_settings().material_max_file_size_bytes)
    content = await file.read(max_size + 1)
    validated = validate_material_file(file.filename, file.content_type, content, max_size)
    if validated.extension not in {".jpg", ".jpeg", ".png"}:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Gambar soal harus JPG atau PNG.")
    image_path = f"{profile['id']}/{uuid4().hex}{validated.extension}"
    await upload_storage_object(profile["access_token"], "question-images", image_path, content, validated.mime_type)
    return ApiResponse(data=ImageUploadResult(
        image_path=image_path,
        file_name=validated.file_name,
        file_mime_type=validated.mime_type,
        file_size_bytes=validated.size_bytes,
    ))


@router.post("/question-images/signed-url", response_model=ApiResponse[dict[str, str]])
async def signed_question_image(
    payload: ImagePathInput,
    profile: Annotated[dict[str, Any], Depends(ANY_ROLE)],
) -> ApiResponse[dict[str, str]]:
    accessible = await select_rows(
        "questions",
        profile["access_token"],
        {"select": "id", "image_path": f"eq.{payload.image_path}", "limit": "1"},
    )
    owned_path = payload.image_path.startswith(f"{profile['id']}/")
    if not accessible and not owned_path:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Gambar tidak dapat diakses.")
    url = await create_storage_signed_url(profile["access_token"], "question-images", payload.image_path, 300)
    return ApiResponse(data={"signed_url": url})


@router.delete("/question-images", response_model=ApiResponse[dict[str, bool]])
async def delete_question_image(
    payload: ImagePathInput,
    profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)],
) -> ApiResponse[dict[str, bool]]:
    if not payload.image_path.startswith(f"{profile['id']}/") or ".." in payload.image_path.split("/"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guru hanya dapat menghapus gambar miliknya.")
    await delete_storage_object(profile["access_token"], "question-images", payload.image_path)
    return ApiResponse(data={"deleted": True})
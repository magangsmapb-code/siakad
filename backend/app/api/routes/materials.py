from datetime import datetime, timezone
from typing import Annotated, Any, Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile, status
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import require_roles
from app.core.config import get_settings
from app.repositories.academic import get_by_id, insert_row, list_page, update_row
from app.schemas.common import ApiResponse
from app.schemas.users import UserRole
from app.services.materials import validate_material_file
from app.services.supabase import create_storage_signed_url, delete_storage_object, select_rows, upload_storage_object

router = APIRouter(prefix="/api")
limiter = Limiter(key_func=get_remote_address)
TEACHER_OR_DEVELOPER = require_roles(UserRole.GURU, UserRole.DEVELOPER)
ANY_ROLE = require_roles(*UserRole)


class MaterialUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=2, max_length=160)
    description: str | None = Field(default=None, max_length=4000)
    subject_id: UUID | None = None


class MaterialDownload(BaseModel):
    signed_url: str
    expires_in: int


async def _teacher_id(profile: dict[str, Any]) -> str:
    rows = await select_rows(
        "teachers",
        profile["access_token"],
        {"select": "id", "profile_id": f"eq.{profile['id']}", "employment_status": "eq.active", "limit": "1"},
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil guru aktif tidak ditemukan.")
    return rows[0]["id"]


@router.get("/materials", response_model=ApiResponse[list[dict[str, Any]]])
async def list_materials(
    profile: Annotated[dict[str, Any], Depends(ANY_ROLE)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    class_id: UUID | None = None,
    subject_id: UUID | None = None,
    material_status: Literal["draft", "published", "archived"] | None = Query(default=None, alias="status"),
    sort_by: str = "created_at",
    sort_direction: Literal["asc", "desc"] = "desc",
) -> ApiResponse[list[dict[str, Any]]]:
    filters = {
        "class_id": str(class_id) if class_id else None,
        "subject_id": str(subject_id) if subject_id else None,
        "status": material_status,
    }
    rows, total = await list_page(
        "materials",
        profile["access_token"],
        page=page,
        page_size=page_size,
        search=search,
        filters=filters,
        sort_by=sort_by,
        descending=sort_direction == "desc",
    )
    from math import ceil

    return ApiResponse(data=rows, meta={"page": page, "page_size": page_size, "total": total, "pages": ceil(total / page_size) if total else 0})


@router.get("/materials/{material_id}", response_model=ApiResponse[dict[str, Any]])
async def get_material(material_id: UUID, profile: Annotated[dict[str, Any], Depends(ANY_ROLE)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await get_by_id("materials", profile["access_token"], str(material_id)))


@router.post("/materials", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().api_rate_limit)
async def upload_material(
    request: Request,
    profile: Annotated[dict[str, Any], Depends(require_roles(UserRole.GURU))],
    class_id: UUID = Form(),
    title: str = Form(min_length=2, max_length=160),
    description: str | None = Form(default=None, max_length=4000),
    subject_id: UUID | None = Form(default=None),
    file: UploadFile = File(),
) -> ApiResponse[dict[str, Any]]:
    teacher_id = await _teacher_id(profile)
    classes = await select_rows(
        "classes",
        profile["access_token"],
        {"select": "id", "id": f"eq.{class_id}", "limit": "1"},
    )
    if not classes:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guru tidak memiliki akses ke kelas tersebut.")

    max_size = get_settings().material_max_file_size_bytes
    content = await file.read(max_size + 1)
    validated = validate_material_file(file.filename, file.content_type, content, max_size)
    object_path = f"{class_id}/{teacher_id}/{uuid4().hex}{validated.extension}"
    await upload_storage_object(profile["access_token"], "materials", object_path, content, validated.mime_type)

    try:
        row = await insert_row("materials", profile["access_token"], {
            "class_id": str(class_id),
            "subject_id": str(subject_id) if subject_id else None,
            "teacher_id": teacher_id,
            "title": title.strip(),
            "description": description.strip() if description else None,
            "storage_path": object_path,
            "file_name": validated.file_name,
            "file_mime_type": validated.mime_type,
            "file_size_bytes": validated.size_bytes,
            "status": "draft",
        })
    except Exception:
        await delete_storage_object(profile["access_token"], "materials", object_path)
        raise
    return ApiResponse(data=row)


@router.put("/materials/{material_id}", response_model=ApiResponse[dict[str, Any]])
async def update_material(
    material_id: UUID,
    payload: MaterialUpdate,
    profile: Annotated[dict[str, Any], Depends(TEACHER_OR_DEVELOPER)],
) -> ApiResponse[dict[str, Any]]:
    values = payload.model_dump(exclude_unset=True, mode="json")
    if not values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada perubahan yang dikirim.")
    if values.get("title") is not None:
        values["title"] = values["title"].strip()
    return ApiResponse(data=await update_row("materials", profile["access_token"], str(material_id), values))


@router.post("/materials/{material_id}/publish", response_model=ApiResponse[dict[str, Any]])
async def publish_material(material_id: UUID, profile: Annotated[dict[str, Any], Depends(TEACHER_OR_DEVELOPER)]) -> ApiResponse[dict[str, Any]]:
    row = await get_by_id("materials", profile["access_token"], str(material_id))
    if row["status"] == "archived":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Materi yang diarsipkan tidak dapat dipublikasikan.")
    return ApiResponse(data=await update_row("materials", profile["access_token"], str(material_id), {
        "status": "published",
        "published_at": datetime.now(timezone.utc).isoformat(),
    }))


@router.post("/materials/{material_id}/unpublish", response_model=ApiResponse[dict[str, Any]])
async def unpublish_material(material_id: UUID, profile: Annotated[dict[str, Any], Depends(TEACHER_OR_DEVELOPER)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("materials", profile["access_token"], str(material_id), {"status": "draft", "published_at": None}))


@router.delete("/materials/{material_id}", response_model=ApiResponse[dict[str, Any]])
async def archive_material(material_id: UUID, profile: Annotated[dict[str, Any], Depends(TEACHER_OR_DEVELOPER)]) -> ApiResponse[dict[str, Any]]:
    row = await get_by_id("materials", profile["access_token"], str(material_id))
    archived = await update_row("materials", profile["access_token"], str(material_id), {"status": "archived", "published_at": None})
    if row.get("storage_path"):
        await delete_storage_object(profile["access_token"], "materials", row["storage_path"])
    return ApiResponse(data=archived)


@router.get("/materials/{material_id}/download", response_model=ApiResponse[MaterialDownload])
async def download_material(
    material_id: UUID,
    profile: Annotated[dict[str, Any], Depends(ANY_ROLE)],
    expires_in: int = Query(default=300, ge=30, le=900),
) -> ApiResponse[MaterialDownload]:
    row = await get_by_id("materials", profile["access_token"], str(material_id))
    if not row.get("storage_path"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File materi tidak ditemukan.")
    signed_url = await create_storage_signed_url(profile["access_token"], "materials", row["storage_path"], expires_in)
    return ApiResponse(data=MaterialDownload(signed_url=signed_url, expires_in=expires_in))
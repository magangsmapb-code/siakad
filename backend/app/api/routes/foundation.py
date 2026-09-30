from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.api.deps import current_profile, require_roles
from app.core.config import get_settings
from app.schemas.common import ApiResponse
from app.schemas.users import ProfileRead, UserCreate, UserRole, UserUpdate
from app.services.supabase import admin_request, select_rows
from app.utils.email import normalize_email

router = APIRouter(prefix="/api")
limiter = Limiter(key_func=get_remote_address)
DEVELOPER_ONLY = require_roles(UserRole.DEVELOPER)
STAFF_ROLES = require_roles(UserRole.DEVELOPER, UserRole.GURU)
ANY_ROLE = require_roles(*UserRole)


@router.get("/profile", response_model=ApiResponse[ProfileRead])
async def get_profile(profile: Annotated[dict[str, Any], Depends(current_profile)]) -> ApiResponse[ProfileRead]:
    return ApiResponse(data=ProfileRead.model_validate(profile))


@router.get("/users", response_model=ApiResponse[list[dict[str, Any]]])
async def get_users(profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[list[dict[str, Any]]]:
    rows = await select_rows("profiles", profile["access_token"], {"select": "id,email,full_name,role,status,created_at", "order": "created_at.desc"})
    return ApiResponse(data=rows)


@router.post("/users", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
@limiter.limit(get_settings().api_rate_limit)
async def create_user(
    request: Request,
    user_input: UserCreate,
    profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)],
) -> ApiResponse[dict[str, Any]]:
    created = await admin_request("POST", "/auth/v1/invite", {
        "email": normalize_email(str(user_input.email)),
        "data": {"full_name": user_input.full_name},
    })
    user_id = created["id"]
    profile_result = await admin_request("PATCH", f"/rest/v1/profiles?id=eq.{user_id}", {
        "email": normalize_email(str(user_input.email)),
        "full_name": user_input.full_name,
        "role": user_input.role.value,
    })
    return ApiResponse(data={"id": user_id, "email": normalize_email(str(user_input.email)), "role": user_input.role, "profile": profile_result})


@router.put("/users/{user_id}", response_model=ApiResponse[dict[str, Any]])
@limiter.limit(get_settings().api_rate_limit)
async def update_user(
    request: Request,
    user_id: UUID,
    user_input: UserUpdate,
    profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)],
) -> ApiResponse[dict[str, Any]]:
    values = user_input.model_dump(exclude_unset=True, exclude_none=True, mode="json")
    if not values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada perubahan yang dikirim.")
    rows = await admin_request("PATCH", f"/rest/v1/profiles?id=eq.{user_id}", values)
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profil tidak ditemukan.")
    row = rows[0]
    return ApiResponse(data=row)


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(get_settings().api_rate_limit)
async def delete_user(
    request: Request,
    user_id: UUID,
    profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)],
) -> Response:
    if str(user_id) == profile["id"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Akun sendiri tidak dapat dihapus dari sesi aktif.")
    await admin_request("DELETE", f"/auth/v1/admin/users/{user_id}")
    return Response(status_code=status.HTTP_204_NO_CONTENT)



from collections.abc import Callable
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.schemas.users import UserRole
from app.repositories.profiles import get_profile_by_id
from app.services.supabase import select_rows, validate_access_token

bearer_scheme = HTTPBearer(auto_error=False)


async def current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bearer token diperlukan.")
    user = await validate_access_token(credentials.credentials)
    user["access_token"] = credentials.credentials
    return user


async def current_profile(user: Annotated[dict[str, Any], Depends(current_user)]) -> dict[str, Any]:
    profile = await get_profile_by_id(user["id"], user["access_token"])
    if not profile:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil akun belum tersedia.")
    if profile.get("status") != "active":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akun tidak aktif.")
    return {**profile, "access_token": user["access_token"]}


def require_roles(*roles: UserRole) -> Callable[..., Any]:
    async def check_role(profile: Annotated[dict[str, Any], Depends(current_profile)]) -> dict[str, Any]:
        if profile.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Peran tidak memiliki akses ke resource ini.")
        return profile

    return check_role
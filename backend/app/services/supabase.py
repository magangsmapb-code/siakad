from typing import Any

import httpx
from fastapi import HTTPException, status
from urllib.parse import quote

from app.core.config import get_settings


def _headers(access_token: str) -> dict[str, str]:
    settings = get_settings()
    return {
        "apikey": settings.supabase_anon_key,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


async def validate_access_token(access_token: str) -> dict[str, Any]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(
            f"{settings.supabase_url}/auth/v1/user",
            headers=_headers(access_token),
        )
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid atau kedaluwarsa.")
    return response.json()


async def select_rows(table: str, access_token: str, query: dict[str, str]) -> list[dict[str, Any]]:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/{table}",
            headers=_headers(access_token),
            params=query,
        )
    if response.is_error:
        raise HTTPException(status_code=response.status_code, detail="Data tidak dapat diakses.")
    return response.json()


async def admin_request(method: str, path: str, payload: dict[str, Any] | None = None) -> Any:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Operasi administrasi belum dikonfigurasi.")
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
    }
    if path.startswith("/rest/v1/"):
        headers["Prefer"] = "return=representation"
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.request(method, f"{settings.supabase_url}{path}", headers=headers, json=payload)
    if response.is_error:
        message = response.json().get("msg", "Operasi administrasi gagal.")
        raise HTTPException(status_code=response.status_code, detail=message)
    if response.status_code == status.HTTP_204_NO_CONTENT or not response.content:
        return {}
    return response.json()


async def upload_storage_object(access_token: str, bucket: str, object_path: str, content: bytes, content_type: str) -> None:
    settings = get_settings()
    path = quote(object_path, safe="/")
    headers = {**_headers(access_token), "Content-Type": content_type, "x-upsert": "false"}
    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(f"{settings.supabase_url}/storage/v1/object/{bucket}/{path}", headers=headers, content=content)
    if response.is_error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="File tidak dapat disimpan ke private storage.")


async def delete_storage_object(access_token: str, bucket: str, object_path: str) -> None:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.delete(
            f"{settings.supabase_url}/storage/v1/object/{bucket}",
            headers=_headers(access_token),
            json={"prefixes": [object_path]},
        )
    if response.is_error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="File tidak dapat dihapus dari private storage.")


async def create_storage_signed_url(access_token: str, bucket: str, object_path: str, expires_in: int) -> str:
    settings = get_settings()
    path = quote(object_path, safe="/")
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/storage/v1/object/sign/{bucket}/{path}",
            headers=_headers(access_token),
            json={"expiresIn": expires_in},
        )
    if response.is_error:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="File tidak dapat diakses oleh akun ini.")
    signed_path = response.json().get("signedURL")
    if not signed_path:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Storage tidak mengembalikan signed URL.")
    if signed_path.startswith("https://"):
        return signed_path
    return f"{settings.supabase_url}{signed_path if signed_path.startswith('/') else f'/{signed_path}'}"
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.services.supabase import _headers

RESOURCE_TABLES = {
    "academic_years": "academic_years",
    "teachers": "teachers",
    "students": "students",
    "classes": "classes",
    "subjects": "subjects",
    "schedules": "schedules",
    "materials": "materials",
    "questions": "questions",
    "question_bank": "question_bank",
}

SEARCH_COLUMNS = {
    "academic_years": ("name",),
    "teachers": ("employee_number", "department"),
    "students": ("student_number",),
    "classes": ("name",),
    "subjects": ("code", "name"),
    "schedules": ("room",),
    "materials": ("title", "description", "file_name"),
    "questions": ("prompt", "chapter", "topic"),
}

SORT_COLUMNS = {
    "academic_years": {"name", "starts_on", "ends_on", "status", "created_at"},
    "teachers": {"employee_number", "department", "employment_status", "created_at"},
    "students": {"student_number", "enrollment_status", "created_at"},
    "classes": {"name", "grade_level", "status", "created_at"},
    "subjects": {"code", "name", "status", "created_at"},
    "schedules": {"starts_at", "ends_at", "status", "room", "created_at"},
    "materials": {"title", "status", "published_at", "created_at"},
    "questions": {"prompt", "chapter", "topic", "difficulty", "question_type", "status", "created_at"},
}

FILTER_COLUMNS = {
    "academic_years": {"status": "status"},
    "teachers": {"status": "employment_status"},
    "students": {"status": "enrollment_status", "class_id": "class_id"},
    "classes": {"status": "status", "academic_year_id": "academic_year_id", "grade_level": "grade_level"},
    "subjects": {"status": "status"},
    "schedules": {"status": "status", "class_id": "class_id", "teacher_id": "teacher_id", "subject_id": "subject_id"},
    "materials": {"status": "status", "class_id": "class_id", "subject_id": "subject_id"},
    "questions": {"status": "status", "class_id": "class_id", "subject_id": "subject_id", "difficulty": "difficulty", "question_type": "question_type"},
}


def _resource_table(resource: str) -> str:
    table = RESOURCE_TABLES.get(resource)
    if not table:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource tidak ditemukan.")
    return table


def _raise_database_error(response: httpx.Response) -> None:
    if not response.is_error:
        return
    code = response.status_code
    if code not in {400, 401, 403, 404, 409, 422, 429}:
        code = status.HTTP_502_BAD_GATEWAY
    try:
        body = response.json()
        message = body.get("message") or body.get("details") or body.get("hint") or "Permintaan database gagal."
    except ValueError:
        message = "Permintaan database gagal."
    raise HTTPException(status_code=code, detail=str(message))


async def list_page(
    resource: str,
    access_token: str,
    *,
    page: int,
    page_size: int,
    search: str | None,
    filters: dict[str, str | None],
    sort_by: str,
    descending: bool,
) -> tuple[list[dict[str, Any]], int | None]:
    table = _resource_table(resource)
    if sort_by not in SORT_COLUMNS[resource]:
        raise HTTPException(status_code=422, detail="Kolom pengurutan tidak diizinkan.")

    params: dict[str, str] = {
        "select": "*",
        "order": f"{sort_by}.{ 'desc' if descending else 'asc' }.nullslast",
        "limit": str(page_size),
        "offset": str((page - 1) * page_size),
    }
    for filter_name, value in filters.items():
        column = FILTER_COLUMNS[resource].get(filter_name)
        if value is not None and column:
            params[column] = f"eq.{value}"

    if search:
        term = search.strip()[:100]
        term = "".join(character for character in term if character not in "*,()")
        if term:
            params["or"] = f"({','.join(f'{column}.ilike.*{term}*' for column in SEARCH_COLUMNS[resource])})"

    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/{table}",
            headers={**_headers(access_token), "Prefer": "count=exact"},
            params=params,
        )
    _raise_database_error(response)
    content_range = response.headers.get("content-range", "")
    total: int | None = None
    if "/" in content_range:
        total_value = content_range.rsplit("/", maxsplit=1)[1]
        if total_value.isdigit():
            total = int(total_value)
    return response.json(), total


async def get_by_id(resource: str, access_token: str, resource_id: str) -> dict[str, Any]:
    table = _resource_table(resource)
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/{table}",
            headers=_headers(access_token),
            params={"select": "*", "id": f"eq.{resource_id}", "limit": "1"},
        )
    _raise_database_error(response)
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data tidak ditemukan.")
    return rows[0]


async def get_profile_role(access_token: str, profile_id: str) -> str:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(
            f"{settings.supabase_url}/rest/v1/profiles",
            headers=_headers(access_token),
            params={"select": "role,status", "id": f"eq.{profile_id}", "limit": "1"},
        )
    _raise_database_error(response)
    rows = response.json()
    if not rows or rows[0].get("status") != "active":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profil aktif tidak ditemukan.")
    return str(rows[0].get("role", ""))


async def insert_row(resource: str, access_token: str, values: dict[str, Any]) -> dict[str, Any]:
    table = _resource_table(resource)
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/rest/v1/{table}",
            headers={**_headers(access_token), "Prefer": "return=representation"},
            json=values,
        )
    _raise_database_error(response)
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Database tidak mengembalikan data yang dibuat.")
    return rows[0]


async def update_row(resource: str, access_token: str, resource_id: str, values: dict[str, Any]) -> dict[str, Any]:
    table = _resource_table(resource)
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.patch(
            f"{settings.supabase_url}/rest/v1/{table}",
            headers={**_headers(access_token), "Prefer": "return=representation"},
            params={"id": f"eq.{resource_id}"},
            json=values,
        )
    _raise_database_error(response)
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data tidak ditemukan.")
    return rows[0]


async def delete_row(resource: str, access_token: str, resource_id: str) -> None:
    table = _resource_table(resource)
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.delete(
            f"{settings.supabase_url}/rest/v1/{table}",
            headers={**_headers(access_token), "Prefer": "return=representation"},
            params={"id": f"eq.{resource_id}", "select": "id"},
        )
    _raise_database_error(response)
    if not response.json():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Data tidak ditemukan.")
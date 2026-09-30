from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings
from app.services.supabase import _headers, select_rows


async def get_answer_key(access_token: str, question_id: str) -> dict[str, Any] | None:
    rows = await select_rows(
        "question_keys",
        access_token,
        {"select": "question_id,answer_key,explanation", "question_id": f"eq.{question_id}", "limit": "1"},
    )
    return rows[0] if rows else None


async def upsert_answer_key(access_token: str, question_id: str, answer_key: Any, explanation: str | None) -> None:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{settings.supabase_url}/rest/v1/question_keys",
            headers={**_headers(access_token), "Prefer": "resolution=merge-duplicates,return=minimal"},
            params={"on_conflict": "question_id"},
            json={"question_id": question_id, "answer_key": answer_key, "explanation": explanation},
        )
    if response.is_error:
        code = response.status_code if response.status_code in {400, 401, 403, 404, 409, 422, 429} else status.HTTP_502_BAD_GATEWAY
        raise HTTPException(status_code=code, detail="Kunci jawaban tidak dapat disimpan.")
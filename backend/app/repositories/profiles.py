from typing import Any

from app.core.config import get_settings
from app.services.supabase import select_rows


async def get_profile_by_id(profile_id: str, access_token: str) -> dict[str, Any] | None:
    rows = await select_rows(
        "profiles",
        access_token,
        {"select": "id,email,full_name,role,status,avatar_url", "id": f"eq.{profile_id}", "limit": "1"},
    )
    return rows[0] if rows else None
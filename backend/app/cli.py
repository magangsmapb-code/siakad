import argparse
import asyncio
from typing import Any

from pydantic import EmailStr, TypeAdapter

from app.core.config import get_settings
from app.services.supabase import admin_request

DEFAULT_DEMO_ACCOUNTS = [
    {"full_name": "Demo Developer", "role": "DEVELOPER", "email": "developer.siakad.demo@gmail.com"},
    {"full_name": "Demo Guru", "role": "GURU", "email": "guru.siakad.demo@gmail.com"},
    {"full_name": "Demo Murid", "role": "MURID", "email": "murid.siakad.demo@gmail.com"},
]


async def invite_demo_account(email: str, *, role: str, full_name: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.supabase_service_role_key:
        raise RuntimeError("SUPABASE_SERVICE_ROLE_KEY belum tersedia di backend/.env.")

    normalized_email = email.strip().lower()
    invited_user = await admin_request(
        "POST",
        "/auth/v1/invite",
        {
            "email": normalized_email,
            "data": {"full_name": full_name},
        },
    )
    user_id = invited_user["id"]

    try:
        rows = await admin_request(
            "PATCH",
            f"/rest/v1/profiles?id=eq.{user_id}",
            {"full_name": full_name, "role": role},
        )
        if not rows:
            rows = await admin_request(
                "POST",
                "/rest/v1/profiles",
                {"id": user_id, "full_name": full_name, "role": role},
            )
        if not rows:
            raise RuntimeError("Profil akun demo tidak ditemukan atau tidak dapat dibuat.")
    except Exception:
        await admin_request("DELETE", f"/auth/v1/admin/users/{user_id}")
        raise

    return {"id": user_id, "email": normalized_email, "role": role, "full_name": full_name}


async def invite_demo_accounts(accounts: list[dict[str, str]]) -> list[dict[str, Any]]:
    created: list[dict[str, Any]] = []
    for account in accounts:
        created.append(await invite_demo_account(account["email"], role=account["role"], full_name=account["full_name"]))
    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Membuat akun demo SIAKAD untuk semua role atau satu role tertentu.")
    parser.add_argument("email", nargs="?", help="Email untuk akun tunggal yang akan menerima undangan Supabase")
    parser.add_argument("--role", choices=["DEVELOPER", "GURU", "MURID"], default="DEVELOPER", help="Role untuk akun tunggal")
    parser.add_argument("--full-name", default="Demo User", help="Nama lengkap untuk akun tunggal")
    parser.add_argument("--all-demo", action="store_true", help="Buat akun demo default untuk semua role")
    arguments = parser.parse_args()

    if arguments.all_demo:
        accounts = asyncio.run(invite_demo_accounts(DEFAULT_DEMO_ACCOUNTS))
        for account in accounts:
            print(f"Supabase invitation sent: {account['email']} (role {account['role']}, name {account['full_name']})")
        return

    if not arguments.email:
        parser.error("Email wajib diisi jika --all-demo tidak dipakai.")

    email = TypeAdapter(EmailStr).validate_python(arguments.email)
    account = asyncio.run(invite_demo_account(str(email), role=arguments.role, full_name=arguments.full_name))
    print(f"Supabase invitation sent: {account['email']} (role {account['role']}, name {account['full_name']}).")


if __name__ == "__main__":
    main()
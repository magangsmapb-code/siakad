import sys, os, asyncio, httpx
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from app.core.config import get_settings
settings = get_settings()
SERVICE = settings.supabase_service_role_key
URL = settings.supabase_url

async def main():
    headers = {
        "apikey": SERVICE,
        "Authorization": f"Bearer {SERVICE}",
        "Content-Type": "application/json",
    }
    print("== List 5 auth users terbaru ==")
    async with httpx.AsyncClient(timeout=60) as c:
        r = await c.get(f"{URL}/auth/v1/admin/users?page=1&per_page=5", headers=headers)
        print("Status list users:", r.status_code, r.text[:100] if r.status_code >= 400 else "")
        data = r.json() if r.status_code < 300 else {}
        users = data.get("users", [])
        emails_ids = [(u.get("email"), u.get("id"), u.get("email_confirmed_at")) for u in users]
        for e,i,ec in emails_ids:
            print(f"  {e} id={i} confirmed={ec}")
    if emails_ids:
        latest_id = emails_ids[0][1]
        print(f"\n== Profile user terbaru id={latest_id} ==")
        async with httpx.AsyncClient(timeout=60) as c:
            r2 = await c.get(f"{URL}/rest/v1/profiles", headers={**headers, "Prefer": "return=representation"},
                             params={"select": "id,role,status,full_name", "id": f"eq.{latest_id}"})
            print("Status:", r2.status_code)
            print("Content:", r2.text[:500])
            r3 = await c.get(f"{URL}/rest/v1/profiles", headers={**headers, "Prefer": "return=representation"},
                             params={"select": "id,role,status,full_name", "limit": "10", "order": "created_at.desc.nullslast"})
            print("\n== 10 profiles terakhir ==")
            print("Status:", r3.status_code)
            if r3.status_code == 200:
                rows = r3.json()
                print("Jumlah rows:", len(rows))
                for p in rows:
                    print(f"  id={p.get('id')} role={p.get('role')} status={p.get('status')} name={p.get('full_name')}")
            else:
                print("Error:", r3.text[:500])

asyncio.run(main())

# SIAKAD SMA Pemberdayaan Bangsa

Foundation workspace for the web application and its Supabase-backed FastAPI service.

## Requirements

- Node.js 20.9 or newer and npm
- Python 3.11 or newer
- A Supabase project for hosted development, or Docker for the local Supabase stack

## Configure

Copy `frontend/.env.example` to `frontend/.env.local` and set the project's Supabase URL and public anon/publishable key. Set `NEXT_PUBLIC_API_URL` to the FastAPI origin, normally `http://localhost:8000` during local development.

Copy `backend/.env.example` to `backend/.env`. Set the same Supabase URL and anon key. The service-role key is server-only and is required only for developer account management. Never put it in a `NEXT_PUBLIC_*` variable or commit either environment file.

In Supabase Auth, configure the site URL and redirect URLs for the frontend. Enable Google and Facebook providers and set their callback URL to the Supabase Auth callback shown in the project's provider settings. The app callback is `/auth/callback`.

## Apply the database foundation

With the Supabase CLI installed and linked to the intended project, review and apply the migration:

```sh
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

For local development, start Docker, then run `npx supabase start` and `npx supabase db reset` from the repository root. The migration creates private Storage buckets and RLS policies. Do not apply it to a production project before reviewing the access rules and taking a backup.

## Run the frontend

```sh
cd frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:3000`. Production validation uses `npm run lint` and `npm run build` from `frontend/`.

## Run the API

```sh
cd backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API health check is `GET /health`; interactive API documentation is available at `/docs`. Protected API requests require a Supabase access token in the `Authorization: Bearer ...` header. Data requests use that token with PostgREST so database RLS remains in force.

## Account roles

Public signup creates a `MURID` profile through the database trigger. Google/Facebook sign-in follows the same default. `GURU` and `DEVELOPER` roles are assigned through authorized account management, not user-editable auth metadata. The initial developer account must be provisioned through a trusted administrative process after applying the migration.

To bootstrap the first demo developer after configuring `backend/.env` and applying the migration, run from `backend/`:

```sh
python -m app.cli magangsmapb@gmail.com
```

This sends a Supabase invitation and assigns `DEVELOPER` using the server-only key. It does not set or print a password. The email must not already belong to a Supabase Auth account.
# Citeable API (FastAPI)

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # set SECRET_KEY (32+ chars) and DATABASE_URL
uvicorn app.main:create_app --factory --reload
pytest                      # needs SECRET_KEY only for the app; tests set their own
```
Docs: http://localhost:8000/docs (disabled when ENVIRONMENT=production). With `EMAIL_BACKEND=console`, verification/reset links are printed in the server log.

## Structure
`routers/` HTTP only -> `services/` business logic (one per module) -> `models.py`. All wiring is in `deps.py` (FastAPI `Depends`), so tests swap `EmailService` / `GoogleOAuthService` with fakes.

## Auth endpoints (`/api/v1`)
register, verify-email, resend-verification, login, google, refresh, logout, logout-all, forgot-password, reset-password, change-password, plus `GET/PATCH /users/me` and `/domains` CRUD + competitors.
Access token (15 min JWT) in JSON body; refresh token in an HttpOnly cookie, rotated on every use.

## Before production
Use Alembic instead of `AUTO_CREATE_TABLES`, set `ENVIRONMENT=production` (secure cookies, HSTS, docs off), put it behind HTTPS, and swap the in-memory rate limiter for Redis if you run more than one worker.

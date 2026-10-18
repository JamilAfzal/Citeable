import re

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.deps import get_email_service, get_google_service
from app.main import create_app
from app.services.google_service import GoogleIdentity

PW = "Str0ngPassw0rd!"


class FakeEmail:
    def __init__(self): self.outbox = []
    async def send_verification(self, to, token): self.outbox.append(("verify", to, token))
    async def send_password_reset(self, to, token): self.outbox.append(("reset", to, token))
    async def send_account_exists(self, to): self.outbox.append(("exists", to, None))
    def last(self, kind): return [m for m in self.outbox if m[0] == kind][-1][2]


class FakeGoogle:
    identity = GoogleIdentity("g-123", "gina@example.com", True, "Gina")
    async def verify(self, token): return self.identity


@pytest_asyncio.fixture
async def env(tmp_path):
    s = Settings(secret_key="k" * 48, database_url=f"sqlite+aiosqlite:///{tmp_path}/t.db", max_failed_logins=3)
    app = create_app(s)
    email, google = FakeEmail(), FakeGoogle()
    app.dependency_overrides[get_email_service] = lambda: email
    app.dependency_overrides[get_google_service] = lambda: google
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c, email, google


async def signup(c, email, mail, addr="a@example.com"):
    r = await c.post("/api/v1/auth/register", json={"full_name": "Alex", "email": addr, "password": PW, "accept_terms": True})
    assert r.status_code == 202
    r = await c.post("/api/v1/auth/verify-email", json={"token": mail.last("verify")})
    assert r.status_code == 200


async def login(c, addr="a@example.com", pw=PW):
    return await c.post("/api/v1/auth/login", json={"email": addr, "password": pw})


async def test_register_verify_login_me(env):
    c, mail, _ = env
    await c.post("/api/v1/auth/register", json={"full_name": "Alex", "email": "a@example.com", "password": PW, "accept_terms": True})
    assert (await login(c)).json()["error"]["code"] == "email_not_verified"
    await c.post("/api/v1/auth/verify-email", json={"token": mail.last("verify")})
    r = await login(c)
    assert r.status_code == 200 and "refresh_token" in r.headers["set-cookie"] and "HttpOnly" in r.headers["set-cookie"]
    me = await c.get("/api/v1/users/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.json()["email"] == "a@example.com" and "password_hash" not in me.text


async def test_duplicate_register_does_not_leak(env):
    c, mail, _ = env
    await signup(c, "a@example.com", mail)
    r = await c.post("/api/v1/auth/register", json={"full_name": "Eve", "email": "a@example.com", "password": PW, "accept_terms": True})
    assert r.status_code == 202 and mail.outbox[-1][0] == "exists"


async def test_weak_password_and_terms_rejected(env):
    c, _, _ = env
    for pw in ("short1", "onlyletterslong", "12345678901"):
        r = await c.post("/api/v1/auth/register", json={"full_name": "A B", "email": "x@example.com", "password": pw, "accept_terms": True})
        assert r.status_code == 422
    r = await c.post("/api/v1/auth/register", json={"full_name": "A B", "email": "x@example.com", "password": PW, "accept_terms": False})
    assert r.status_code == 422


async def test_wrong_password_same_error_and_lockout(env):
    c, mail, _ = env
    await signup(c, "a@example.com", mail)
    unknown = await login(c, "nobody@example.com", PW)
    wrong = await login(c, pw="Wrong12345")
    assert unknown.json() == wrong.json()
    await login(c, pw="Wrong12345"); await login(c, pw="Wrong12345")
    locked = await login(c)  # correct password, but locked now
    assert locked.status_code == 429 and locked.json()["error"]["code"] == "account_locked"


async def test_refresh_rotation_and_reuse_detection(env):
    c, mail, _ = env
    await signup(c, "a@example.com", mail)
    await login(c)
    old = c.cookies.get("refresh_token", path="/api/v1/auth")
    r = await c.post("/api/v1/auth/refresh")
    assert r.status_code == 200
    new = c.cookies.get("refresh_token", path="/api/v1/auth")
    assert new != old
    # replay the old (already rotated) token after the grace window -> whole family is revoked
    from app.models import RefreshToken
    from sqlalchemy import update
    from datetime import timedelta
    from app.core.utils import utcnow
    c._transport.app.state.settings.refresh_reuse_grace_seconds = 0
    c.cookies.clear(); c.cookies.set("refresh_token", old, path="/api/v1/auth")
    import asyncio; await asyncio.sleep(0.05)
    assert (await c.post("/api/v1/auth/refresh")).status_code == 401
    c.cookies.clear(); c.cookies.set("refresh_token", new, path="/api/v1/auth")
    assert (await c.post("/api/v1/auth/refresh")).status_code == 401  # the stolen chain is dead


async def test_logout_all_kills_access_token(env):
    c, mail, _ = env
    await signup(c, "a@example.com", mail)
    tok = (await login(c)).json()["access_token"]
    h = {"Authorization": f"Bearer {tok}"}
    assert (await c.get("/api/v1/users/me", headers=h)).status_code == 200
    assert (await c.post("/api/v1/auth/logout-all", headers=h)).status_code == 200
    assert (await c.get("/api/v1/users/me", headers=h)).status_code == 401


async def test_forgot_and_reset_password(env):
    c, mail, _ = env
    await signup(c, "a@example.com", mail)
    tok = (await login(c)).json()["access_token"]
    assert (await c.post("/api/v1/auth/forgot-password", json={"email": "ghost@example.com"})).status_code == 200
    assert not any(m[0] == "reset" for m in mail.outbox)
    await c.post("/api/v1/auth/forgot-password", json={"email": "a@example.com"})
    raw = mail.last("reset")
    assert (await c.post("/api/v1/auth/reset-password", json={"token": raw, "password": "NewPassw0rd99"})).status_code == 200
    assert (await c.post("/api/v1/auth/reset-password", json={"token": raw, "password": "Another1234567"})).status_code == 400  # single use
    assert (await c.get("/api/v1/users/me", headers={"Authorization": f"Bearer {tok}"})).status_code == 401  # old session dead
    assert (await login(c, pw="NewPassw0rd99")).status_code == 200
    assert (await login(c)).status_code == 401


async def test_change_password(env):
    c, mail, _ = env
    await signup(c, "a@example.com", mail)
    h = {"Authorization": f"Bearer {(await login(c)).json()['access_token']}"}
    assert (await c.post("/api/v1/auth/change-password", headers=h, json={"current_password": "bad", "new_password": "NewPassw0rd99"})).status_code == 401
    r = await c.post("/api/v1/auth/change-password", headers=h, json={"current_password": PW, "new_password": "NewPassw0rd99"})
    assert r.status_code == 200 and r.json()["access_token"]


async def test_google_login_creates_and_links(env):
    c, mail, google = env
    r = await c.post("/api/v1/auth/google", json={"id_token": "x" * 30})
    assert r.status_code == 200 and r.json()["user"]["google_linked"] and r.json()["user"]["is_verified"]
    await c.post("/api/v1/auth/google", json={"id_token": "x" * 30})  # idempotent
    # unverified squatter account is neutralised when the real owner signs in with Google
    await c.post("/api/v1/auth/register", json={"full_name": "Squat", "email": "sam@example.com", "password": PW, "accept_terms": True})
    google.identity = GoogleIdentity("g-456", "sam@example.com", True, "Sam")
    assert (await c.post("/api/v1/auth/google", json={"id_token": "x" * 30})).status_code == 200
    assert (await login(c, "sam@example.com")).status_code == 401  # squatter password is gone
    google.identity = GoogleIdentity("g-789", "unverified@example.com", False, "U")
    assert (await c.post("/api/v1/auth/google", json={"id_token": "x" * 30})).status_code == 401


async def test_domains_crud_isolation_and_limits(env):
    c, mail, _ = env
    await signup(c, "a@example.com", mail)
    await signup(c, "b@example.com", mail, "b@example.com")
    ha = {"Authorization": f"Bearer {(await login(c)).json()['access_token']}"}
    hb = {"Authorization": f"Bearer {(await login(c, 'b@example.com')).json()['access_token']}"}
    r = await c.post("/api/v1/domains", headers=ha, json={"domain": "https://www.Acme.com/pricing", "brand_name": "Acme"})
    assert r.status_code == 201 and r.json()["domain"] == "acme.com"
    did = r.json()["id"]
    assert (await c.post("/api/v1/domains", headers=ha, json={"domain": "other.com", "brand_name": "O"})).status_code == 403  # trial plan: 1 domain
    assert (await c.post("/api/v1/domains", headers=ha, json={"domain": "not a domain", "brand_name": "O"})).status_code == 422
    assert (await c.get(f"/api/v1/domains/{did}", headers=hb)).status_code == 404  # other user's domain
    comp = await c.post(f"/api/v1/domains/{did}/competitors", headers=ha, json={"name": "FinFlow", "website": "finflow.io"})
    assert comp.status_code == 201
    assert len((await c.get(f"/api/v1/domains/{did}", headers=ha)).json()["competitors"]) == 1
    assert (await c.delete(f"/api/v1/domains/{did}/competitors/{comp.json()['id']}", headers=ha)).status_code == 204
    assert (await c.delete(f"/api/v1/domains/{did}", headers=ha)).status_code == 204


async def test_protected_routes_and_headers(env):
    c, _, _ = env
    assert (await c.get("/api/v1/users/me")).status_code == 401
    assert (await c.get("/api/v1/users/me", headers={"Authorization": "Bearer garbage"})).status_code == 401
    r = await c.get("/health")
    assert r.headers["x-content-type-options"] == "nosniff" and r.headers["x-frame-options"] == "DENY"

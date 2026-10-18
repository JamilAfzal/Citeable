import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.config import Settings
from app.deps import get_email_service, get_google_service
from app.main import create_app
from app.services.google_service import GoogleIdentity

ADMIN_PW = "Admin12345!"
CUSTOMER_PW = "CustomerSecret123!"


class FakeEmail:
    def __init__(self):
        self.outbox = []

    async def send_verification(self, to, token):
        self.outbox.append(("verify", to, token))

    async def send_password_reset(self, to, token):
        self.outbox.append(("reset", to, token))

    async def send_account_exists(self, to):
        self.outbox.append(("exists", to, None))

    def last(self, kind):
        return [m for m in self.outbox if m[0] == kind][-1][2]


class FakeGoogle:
    identity = GoogleIdentity("g-admin", "admin@example.com", True, "Admin")

    async def verify(self, token):
        return self.identity


@pytest_asyncio.fixture
async def env(tmp_path):
    s = Settings(
        secret_key="a" * 48,
        database_url=f"sqlite+aiosqlite:///{tmp_path}/admin_test.db",
        superadmin_email="admin@citeable.com",
        superadmin_password=ADMIN_PW,
        superadmin_name="Super Admin",
    )
    app = create_app(s)
    email, google = FakeEmail(), FakeGoogle()
    app.dependency_overrides[get_email_service] = lambda: email
    app.dependency_overrides[get_google_service] = lambda: google
    async with app.router.lifespan_context(app):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
            yield c, email, google


async def test_superadmin_seeded_and_separate_login(env):
    c, mail, _ = env

    # 1. Superadmin can log in via regular /login
    r = await c.post("/api/v1/auth/login", json={"email": "admin@citeable.com", "password": ADMIN_PW})
    assert r.status_code == 200
    user_data = r.json()["user"]
    assert user_data["is_superuser"] is True
    assert user_data["role"] == "superadmin"

    # 2. Superadmin can log in via dedicated /admin-login
    r_admin = await c.post("/api/v1/auth/admin-login", json={"email": "admin@citeable.com", "password": ADMIN_PW})
    assert r_admin.status_code == 200
    admin_tok = r_admin.json()["access_token"]

    # 3. Register a normal customer
    reg = await c.post(
        "/api/v1/auth/register",
        json={"full_name": "John Customer", "email": "john@client.com", "password": CUSTOMER_PW, "accept_terms": True},
    )
    assert reg.status_code == 202
    await c.post("/api/v1/auth/verify-email", json={"token": mail.last("verify")})

    # 4. Customer login via regular /login succeeds
    cust_login = await c.post("/api/v1/auth/login", json={"email": "john@client.com", "password": CUSTOMER_PW})
    assert cust_login.status_code == 200
    assert cust_login.json()["user"]["is_superuser"] is False
    assert cust_login.json()["user"]["role"] == "customer"
    cust_tok = cust_login.json()["access_token"]

    # 5. Customer attempting /admin-login is REJECTED with 403 Forbidden
    cust_admin_attempt = await c.post(
        "/api/v1/auth/admin-login",
        json={"email": "john@client.com", "password": CUSTOMER_PW},
    )
    assert cust_admin_attempt.status_code == 403
    assert cust_admin_attempt.json()["error"]["code"] == "forbidden_admin_only"

    # 6. Customer cannot access /admin/stats
    no_access = await c.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {cust_tok}"})
    assert no_access.status_code == 403

    # 7. Superadmin can access /admin/stats and /admin/users
    stats_res = await c.get("/api/v1/admin/stats", headers={"Authorization": f"Bearer {admin_tok}"})
    assert stats_res.status_code == 200
    assert stats_res.json()["total_customers"] == 1

    users_res = await c.get("/api/v1/admin/users", headers={"Authorization": f"Bearer {admin_tok}"})
    assert users_res.status_code == 200
    user_list = users_res.json()
    assert any(u["email"] == "john@client.com" for u in user_list)


async def test_superadmin_can_impersonate_and_access_customer_dashboard(env):
    c, mail, _ = env

    # Admin login
    r_admin = await c.post("/api/v1/auth/admin-login", json={"email": "admin@citeable.com", "password": ADMIN_PW})
    admin_tok = r_admin.json()["access_token"]

    # Customer registers and adds a domain
    await c.post(
        "/api/v1/auth/register",
        json={"full_name": "Alice Corp", "email": "alice@corp.com", "password": CUSTOMER_PW, "accept_terms": True},
    )
    await c.post("/api/v1/auth/verify-email", json={"token": mail.last("verify")})
    cust_login = await c.post("/api/v1/auth/login", json={"email": "alice@corp.com", "password": CUSTOMER_PW})
    cust_tok = cust_login.json()["access_token"]
    cust_id = cust_login.json()["user"]["id"]

    # Customer creates a domain
    create_dom = await c.post(
        "/api/v1/domains",
        headers={"Authorization": f"Bearer {cust_tok}"},
        json={"domain": "alicecorp.com", "brand_name": "Alice Corp"},
    )
    assert create_dom.status_code == 201

    # Superadmin impersonates customer
    imp_res = await c.post(
        f"/api/v1/admin/impersonate/{cust_id}",
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert imp_res.status_code == 200
    impersonated_tok = imp_res.json()["access_token"]
    assert imp_res.json()["user"]["email"] == "alice@corp.com"

    # With this impersonated token, admin accesses Alice's domains and dashboard
    domains_res = await c.get("/api/v1/domains", headers={"Authorization": f"Bearer {impersonated_tok}"})
    assert domains_res.status_code == 200
    assert len(domains_res.json()) == 1
    assert domains_res.json()[0]["domain"] == "alicecorp.com"

    # Also admin direct customer domains inspection
    direct_doms = await c.get(
        f"/api/v1/admin/users/{cust_id}/domains",
        headers={"Authorization": f"Bearer {admin_tok}"},
    )
    assert direct_doms.status_code == 200
    assert len(direct_doms.json()) == 1
    assert direct_doms.json()[0]["domain"] == "alicecorp.com"

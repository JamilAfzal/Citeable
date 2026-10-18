import logging

import httpx

from app.core.config import Settings

log = logging.getLogger("citeable.email")


class EmailService:
    """console backend prints links to the log (dev). resend backend sends real mail."""

    def __init__(self, settings: Settings):
        self.s = settings

    async def _send(self, to: str, subject: str, text: str) -> None:
        if self.s.email_backend == "resend":
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.post(
                    "https://api.resend.com/emails",
                    headers={"Authorization": f"Bearer {self.s.resend_api_key}"},
                    json={"from": self.s.email_from, "to": [to], "subject": subject, "text": text},
                )
                r.raise_for_status()
        else:
            log.warning("EMAIL to=%s subject=%s\n%s", to, subject, text)

    async def send_verification(self, to: str, token: str) -> None:
        link = f"{self.s.frontend_url}/verify-email?token={token}"
        await self._send(to, "Verify your Citeable email", f"Confirm your email (valid {self.s.verify_token_hours}h):\n{link}")

    async def send_password_reset(self, to: str, token: str) -> None:
        link = f"{self.s.frontend_url}/reset-password?token={token}"
        await self._send(to, "Reset your Citeable password", f"Reset your password (valid {self.s.reset_token_minutes} min):\n{link}\nIf this wasn't you, ignore this email.")

    async def send_account_exists(self, to: str) -> None:
        await self._send(to, "Citeable sign-up attempt", f"Someone tried to create an account with this email, but one already exists.\nLog in: {self.s.frontend_url}/login\nForgot password: {self.s.frontend_url}/forgot-password")

import time
from collections import defaultdict, deque

from fastapi import Request

from app.core.errors import TooManyRequests


class RateLimiter:
    """In-memory sliding window. Use a Redis-backed version when running >1 worker."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit: int, window: int) -> None:
        now = time.monotonic()
        q = self._hits[key]
        while q and now - q[0] > window:
            q.popleft()
        if len(q) >= limit:
            raise TooManyRequests()
        q.append(now)


def rate_limit(name: str, limit: int, window: int = 60):
    async def dependency(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        request.app.state.rate_limiter.check(f"{name}:{ip}", limit, window)

    return dependency

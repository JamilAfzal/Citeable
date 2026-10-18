from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 400
    code = "bad_request"
    message = "Bad request"

    def __init__(self, message: str | None = None, *, code: str | None = None, status_code: int | None = None):
        self.message = message or self.message
        self.code = code or self.code
        self.status_code = status_code or self.status_code
        super().__init__(self.message)


class Unauthorized(AppError):
    status_code, code, message = 401, "unauthorized", "Authentication required"


class Forbidden(AppError):
    status_code, code, message = 403, "forbidden", "You do not have access to this resource"


class NotFound(AppError):
    status_code, code, message = 404, "not_found", "Resource not found"


class Conflict(AppError):
    status_code, code, message = 409, "conflict", "Resource already exists"


class TooManyRequests(AppError):
    status_code, code, message = 429, "too_many_requests", "Too many requests. Try again later."


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _handle(_: Request, exc: AppError):
        headers = {"WWW-Authenticate": "Bearer"} if exc.status_code == 401 else None
        return JSONResponse({"error": {"code": exc.code, "message": exc.message}}, exc.status_code, headers=headers)

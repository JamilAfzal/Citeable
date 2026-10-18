from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.schemas.common import Password
from app.schemas.user import UserOut


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: Password = Field(min_length=8, max_length=128)
    accept_terms: bool

    @field_validator("accept_terms")
    @classmethod
    def _terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError("You must accept the Terms and Privacy Policy")
        return v

    @model_validator(mode="after")
    def _not_email(self):
        if self.password.lower() == str(self.email).lower():
            raise ValueError("Password must not be your email")
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(min_length=20, max_length=4096)


class TokenRequest(BaseModel):
    token: str = Field(min_length=20, max_length=200)


class EmailRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(TokenRequest):
    password: Password = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut

import re
import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

_DOMAIN = re.compile(r"^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$")


def normalize_domain(v: str) -> str:
    v = v.strip().lower()
    v = re.sub(r"^https?://", "", v).removeprefix("www.")
    v = v.split("/")[0].split("?")[0].split(":")[0]
    if not _DOMAIN.match(v):
        raise ValueError("Enter a valid domain, for example acme.com")
    return v


class CompetitorCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    website: str | None = None

    @field_validator("website")
    @classmethod
    def _site(cls, v):
        return normalize_domain(v) if v else None


class CompetitorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    website: str | None


class DomainCreate(BaseModel):
    domain: str
    brand_name: str = Field(min_length=1, max_length=120)
    niche: str | None = Field(default=None, max_length=200)

    _norm = field_validator("domain")(lambda cls, v: normalize_domain(v))


class DomainUpdate(BaseModel):
    brand_name: str | None = Field(default=None, min_length=1, max_length=120)
    niche: str | None = Field(default=None, max_length=200)


class DomainOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    domain: str
    brand_name: str
    niche: str | None
    competitors: list[CompetitorOut]

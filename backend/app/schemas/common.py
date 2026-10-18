import re
from typing import Annotated

from pydantic import AfterValidator, BaseModel


def _strong_password(v: str) -> str:
    if not (re.search(r"[A-Za-z]", v) and re.search(r"\d", v)):
        raise ValueError("Password must contain at least one letter and one number")
    return v


Password = Annotated[str, AfterValidator(_strong_password)]


class Message(BaseModel):
    message: str

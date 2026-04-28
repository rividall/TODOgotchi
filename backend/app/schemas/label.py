import re

from pydantic import BaseModel, Field, field_validator

HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class LabelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    color: str = Field(min_length=7, max_length=7)

    @field_validator("color")
    @classmethod
    def _hex_color(cls, v: str) -> str:
        if not HEX_COLOR_RE.match(v):
            raise ValueError("color must be a 7-character hex string like #FF6B6B")
        return v.upper()


class LabelOut(BaseModel):
    id: int
    name: str
    color: str

    model_config = {"from_attributes": True}

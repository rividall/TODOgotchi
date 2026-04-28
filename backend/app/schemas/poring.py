from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.checklist import ChecklistItemOut
from app.schemas.label import LabelOut


class PoringCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)


class PoringUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)


class PoringOut(BaseModel):
    id: int
    title: str
    description: str | None
    xp: int
    growth_tier: Literal["seed", "happy", "chubby", "ripe"]
    status: Literal["alive", "completed"]
    action_type: Literal["shipped", "booked", "bought", "done", "abandoned"] | None
    checklist: list[ChecklistItemOut] = []
    labels: list[LabelOut] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

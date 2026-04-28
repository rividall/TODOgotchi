from pydantic import BaseModel, Field


class ChecklistItemCreate(BaseModel):
    text: str = Field(min_length=1, max_length=500)


class ChecklistItemUpdate(BaseModel):
    text: str | None = Field(default=None, min_length=1, max_length=500)
    completed: bool | None = None
    order: int | None = Field(default=None, ge=0)


class ChecklistItemOut(BaseModel):
    id: int
    poring_id: int
    text: str
    completed: bool
    order: int

    model_config = {"from_attributes": True}

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class FeedbackCreate(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    email: EmailStr | None = None


class FeedbackOut(BaseModel):
    id: int
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackAdminOut(BaseModel):
    id: int
    message: str
    email: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

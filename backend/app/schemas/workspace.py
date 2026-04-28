from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class WorkspaceOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    model_config = {"from_attributes": True}


class WorkspaceMemberOut(BaseModel):
    id: int
    email: str
    username: str
    model_config = {"from_attributes": True}


class WorkspaceDetailOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    members: list[WorkspaceMemberOut] = []
    model_config = {"from_attributes": True}


class WorkspaceCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class AdminUserOut(BaseModel):
    id: int
    email: str
    username: str
    workspace_id: int | None
    workspaces: list[WorkspaceOut] = []
    model_config = {"from_attributes": True}


class AdminUserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=2, max_length=64)
    password: str = Field(min_length=8, max_length=128)
    workspace_id: int | None = None


class AddMemberRequest(BaseModel):
    email: EmailStr

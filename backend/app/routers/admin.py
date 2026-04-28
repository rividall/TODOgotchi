from fastapi import APIRouter, Depends, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User
from app.models.workspace import UserWorkspace, Workspace
from app.schemas.workspace import (
    AddMemberRequest,
    AdminUserCreate,
    AdminUserOut,
    WorkspaceCreate,
    WorkspaceDetailOut,
    WorkspaceMemberOut,
    WorkspaceOut,
)

router = APIRouter(prefix="/admin", tags=["admin"])

_api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


async def verify_admin_key(x_admin_key: str | None = Security(_api_key_header)) -> None:
    if not settings.ADMIN_API_KEY or x_admin_key != settings.ADMIN_API_KEY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing admin key")


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users", response_model=list[AdminUserOut], dependencies=[Depends(verify_admin_key)])
async def list_users(db: AsyncSession = Depends(get_db)) -> list[AdminUserOut]:
    result = await db.execute(select(User).order_by(User.created_at))
    users = result.scalars().all()
    out = []
    for u in users:
        workspaces: list[WorkspaceOut] = []
        if u.workspace_id is not None:
            ws_result = await db.execute(
                select(Workspace).join(UserWorkspace, UserWorkspace.workspace_id == Workspace.id)
                .where(UserWorkspace.user_id == u.id)
            )
            workspaces = [WorkspaceOut.model_validate(w) for w in ws_result.scalars().all()]
        out.append(AdminUserOut(
            id=u.id,
            email=u.email,
            username=u.username,
            workspace_id=u.workspace_id,
            workspaces=workspaces,
        ))
    return out


@router.post("/users", response_model=AdminUserOut, status_code=201, dependencies=[Depends(verify_admin_key)])
async def create_user(payload: AdminUserCreate, db: AsyncSession = Depends(get_db)) -> AdminUserOut:
    existing = await db.execute(
        select(User).where((User.email == payload.email) | (User.username == payload.username))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email or username already taken")

    if payload.workspace_id is not None:
        ws = await db.execute(select(Workspace).where(Workspace.id == payload.workspace_id))
        if ws.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Workspace not found")

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        workspace_id=payload.workspace_id,
    )
    db.add(user)
    await db.flush()

    workspaces: list[WorkspaceOut] = []
    if payload.workspace_id is not None:
        db.add(UserWorkspace(user_id=user.id, workspace_id=payload.workspace_id))
        ws_result = await db.execute(select(Workspace).where(Workspace.id == payload.workspace_id))
        ws_obj = ws_result.scalar_one()
        workspaces = [WorkspaceOut.model_validate(ws_obj)]

    await db.commit()
    return AdminUserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        workspace_id=user.workspace_id,
        workspaces=workspaces,
    )


@router.delete("/users/{user_id}", status_code=204, dependencies=[Depends(verify_admin_key)])
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


# ─── Workspaces ───────────────────────────────────────────────────────────────

@router.get("/workspaces", response_model=list[WorkspaceDetailOut], dependencies=[Depends(verify_admin_key)])
async def list_workspaces(db: AsyncSession = Depends(get_db)) -> list[WorkspaceDetailOut]:
    ws_result = await db.execute(select(Workspace).order_by(Workspace.created_at))
    workspaces = ws_result.scalars().all()
    out = []
    for ws in workspaces:
        members_result = await db.execute(
            select(User).join(UserWorkspace, UserWorkspace.user_id == User.id)
            .where(UserWorkspace.workspace_id == ws.id)
        )
        members = [WorkspaceMemberOut.model_validate(u) for u in members_result.scalars().all()]
        out.append(WorkspaceDetailOut(
            id=ws.id, name=ws.name, created_at=ws.created_at, members=members
        ))
    return out


@router.post("/workspaces", response_model=WorkspaceOut, status_code=201, dependencies=[Depends(verify_admin_key)])
async def create_workspace(payload: WorkspaceCreate, db: AsyncSession = Depends(get_db)) -> WorkspaceOut:
    ws = Workspace(name=payload.name)
    db.add(ws)
    await db.commit()
    await db.refresh(ws)
    return WorkspaceOut.model_validate(ws)


@router.delete("/workspaces/{workspace_id}", status_code=204, dependencies=[Depends(verify_admin_key)])
async def delete_workspace(workspace_id: int, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = result.scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")
    await db.delete(ws)
    await db.commit()


@router.post("/workspaces/{workspace_id}/members", response_model=AdminUserOut, status_code=201, dependencies=[Depends(verify_admin_key)])
async def add_member(workspace_id: int, payload: AddMemberRequest, db: AsyncSession = Depends(get_db)) -> AdminUserOut:
    ws_result = await db.execute(select(Workspace).where(Workspace.id == workspace_id))
    ws = ws_result.scalar_one_or_none()
    if ws is None:
        raise HTTPException(status_code=404, detail="Workspace not found")

    user_result = await db.execute(select(User).where(User.email == payload.email))
    user = user_result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    existing = await db.execute(
        select(UserWorkspace).where(
            UserWorkspace.user_id == user.id,
            UserWorkspace.workspace_id == workspace_id,
        )
    )
    if existing.scalar_one_or_none() is None:
        db.add(UserWorkspace(user_id=user.id, workspace_id=workspace_id))

    user.workspace_id = workspace_id
    await db.commit()

    return AdminUserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        workspace_id=user.workspace_id,
        workspaces=[WorkspaceOut.model_validate(ws)],
    )


@router.delete("/workspaces/{workspace_id}/members/{user_id}", status_code=204, dependencies=[Depends(verify_admin_key)])
async def remove_member(workspace_id: int, user_id: int, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(
        select(UserWorkspace).where(
            UserWorkspace.user_id == user_id,
            UserWorkspace.workspace_id == workspace_id,
        )
    )
    membership = result.scalar_one_or_none()
    if membership is None:
        raise HTTPException(status_code=404, detail="Member not found in this workspace")

    await db.delete(membership)

    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one_or_none()
    if user and user.workspace_id == workspace_id:
        user.workspace_id = None

    await db.commit()

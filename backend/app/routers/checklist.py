from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.checklist_item import ChecklistItem
from app.models.poring import Poring, PoringStatus
from app.models.user import User
from app.models.xp_event import XPEventType
from app.schemas.checklist import ChecklistItemCreate, ChecklistItemOut, ChecklistItemUpdate
from app.services.xp_service import award_xp

router = APIRouter(prefix="/api/v1/porings", tags=["checklist"])


async def _get_owned_poring(db: AsyncSession, poring_id: int, user: User) -> Poring:
    result = await db.execute(
        select(Poring)
        .options(selectinload(Poring.checklist_items))
        .where(Poring.id == poring_id)
    )
    poring = result.scalar_one_or_none()
    if poring is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poring not found")
    if poring.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your poring")
    return poring


def _require_alive(poring: Poring) -> None:
    if poring.status == PoringStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a completed poring",
        )


async def _get_owned_item(
    db: AsyncSession, poring_id: int, item_id: int, user: User
) -> tuple[Poring, ChecklistItem]:
    poring = await _get_owned_poring(db, poring_id, user)
    result = await db.execute(
        select(ChecklistItem).where(
            ChecklistItem.id == item_id, ChecklistItem.poring_id == poring_id
        )
    )
    item = result.scalar_one_or_none()
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Checklist item not found"
        )
    return poring, item


@router.get("/{poring_id}/checklist", response_model=list[ChecklistItemOut])
async def list_checklist(
    poring_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ChecklistItemOut]:
    poring = await _get_owned_poring(db, poring_id, current_user)
    return [ChecklistItemOut.model_validate(item) for item in poring.checklist_items]


@router.post(
    "/{poring_id}/checklist",
    response_model=ChecklistItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_checklist_item(
    poring_id: int,
    payload: ChecklistItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChecklistItemOut:
    poring = await _get_owned_poring(db, poring_id, current_user)
    _require_alive(poring)

    next_order_row = await db.execute(
        select(func.coalesce(func.max(ChecklistItem.order), -1)).where(
            ChecklistItem.poring_id == poring_id
        )
    )
    next_order = (next_order_row.scalar_one() or 0) + 1

    item = ChecklistItem(poring_id=poring_id, text=payload.text, order=next_order)
    db.add(item)
    await db.flush()

    await award_xp(db, poring, XPEventType.checklist_added, commit=False)
    await db.commit()
    await db.refresh(item)
    return ChecklistItemOut.model_validate(item)


@router.patch("/{poring_id}/checklist/{item_id}", response_model=ChecklistItemOut)
async def update_checklist_item(
    poring_id: int,
    item_id: int,
    payload: ChecklistItemUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChecklistItemOut:
    poring, item = await _get_owned_item(db, poring_id, item_id, current_user)
    _require_alive(poring)

    data = payload.model_dump(exclude_unset=True)
    newly_completed = False

    if "text" in data and data["text"] is not None:
        item.text = data["text"]
    if "order" in data and data["order"] is not None:
        item.order = data["order"]
    if "completed" in data and data["completed"] is not None:
        if data["completed"] and not item.completed:
            newly_completed = True
        item.completed = data["completed"]

    if newly_completed:
        await award_xp(db, poring, XPEventType.checklist_completed, commit=False)

    await db.commit()
    await db.refresh(item)
    return ChecklistItemOut.model_validate(item)


@router.delete(
    "/{poring_id}/checklist/{item_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_checklist_item(
    poring_id: int,
    item_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    _, item = await _get_owned_item(db, poring_id, item_id, current_user)
    await db.delete(item)
    await db.commit()

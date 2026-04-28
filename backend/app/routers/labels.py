from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.label import Label
from app.models.poring import Poring, PoringStatus
from app.models.user import User
from app.models.xp_event import XPEventType
from app.schemas.label import LabelCreate, LabelOut
from app.services.xp_service import award_xp

router = APIRouter(prefix="/api/v1", tags=["labels"])


async def _get_owned_label(db: AsyncSession, label_id: int, user: User) -> Label:
    result = await db.execute(select(Label).where(Label.id == label_id))
    label = result.scalar_one_or_none()
    if label is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Label not found")
    if label.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your label")
    return label


async def _get_owned_poring(db: AsyncSession, poring_id: int, user: User) -> Poring:
    result = await db.execute(
        select(Poring).options(selectinload(Poring.labels)).where(Poring.id == poring_id)
    )
    poring = result.scalar_one_or_none()
    if poring is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poring not found")
    if poring.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your poring")
    return poring


@router.get("/labels", response_model=list[LabelOut])
async def list_labels(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LabelOut]:
    result = await db.execute(
        select(Label).where(Label.user_id == current_user.id).order_by(Label.name)
    )
    return [LabelOut.model_validate(label) for label in result.scalars().all()]


@router.post("/labels", response_model=LabelOut, status_code=status.HTTP_201_CREATED)
async def create_label(
    payload: LabelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LabelOut:
    existing = await db.execute(
        select(Label).where(Label.user_id == current_user.id, Label.name == payload.name)
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Label with this name already exists",
        )

    label = Label(name=payload.name, color=payload.color, user_id=current_user.id)
    db.add(label)
    await db.commit()
    await db.refresh(label)
    return LabelOut.model_validate(label)


@router.post(
    "/porings/{poring_id}/labels/{label_id}",
    response_model=LabelOut,
    status_code=status.HTTP_201_CREATED,
)
async def attach_label(
    poring_id: int,
    label_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LabelOut:
    poring = await _get_owned_poring(db, poring_id, current_user)
    label = await _get_owned_label(db, label_id, current_user)

    if label in poring.labels:
        return LabelOut.model_validate(label)

    if poring.status == PoringStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify a completed poring",
        )

    poring.labels.append(label)
    await db.flush()
    await award_xp(db, poring, XPEventType.label_attached, commit=False)
    await db.commit()
    return LabelOut.model_validate(label)


@router.delete(
    "/porings/{poring_id}/labels/{label_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def detach_label(
    poring_id: int,
    label_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    poring = await _get_owned_poring(db, poring_id, current_user)
    label = await _get_owned_label(db, label_id, current_user)
    if label in poring.labels:
        poring.labels.remove(label)
        await db.commit()

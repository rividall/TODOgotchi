from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.poring import ActionType, Poring, PoringStatus
from app.models.user import User
from app.models.xp_event import XPEventType
from app.schemas.act import ActRequest
from app.schemas.checklist import ChecklistItemOut
from app.schemas.label import LabelOut
from app.schemas.poring import PoringCreate, PoringOut, PoringUpdate
from app.services.xp_service import award_xp, compute_tier

RIPE_THRESHOLD = 60

router = APIRouter(prefix="/api/v1/porings", tags=["porings"])


def _to_out(poring: Poring) -> PoringOut:
    return PoringOut(
        id=poring.id,
        title=poring.title,
        description=poring.description,
        xp=poring.xp,
        growth_tier=compute_tier(poring.xp),  # type: ignore[arg-type]
        status=poring.status.value,  # type: ignore[arg-type]
        action_type=poring.action_type.value if poring.action_type else None,  # type: ignore[arg-type]
        checklist=[ChecklistItemOut.model_validate(item) for item in poring.checklist_items],
        labels=[LabelOut.model_validate(label) for label in poring.labels],
        created_at=poring.created_at,
        updated_at=poring.updated_at,
    )


def _poring_query():
    return select(Poring).options(
        selectinload(Poring.checklist_items),
        selectinload(Poring.labels),
    )


async def _get_owned_poring(db: AsyncSession, poring_id: int, user: User) -> Poring:
    result = await db.execute(_poring_query().where(Poring.id == poring_id))
    poring = result.scalar_one_or_none()
    if poring is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Poring not found")
    if poring.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your poring")
    return poring


@router.get("", response_model=list[PoringOut])
async def list_porings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[PoringOut]:
    result = await db.execute(
        _poring_query().where(Poring.user_id == current_user.id).order_by(Poring.created_at)
    )
    return [_to_out(p) for p in result.scalars().all()]


@router.post("", response_model=PoringOut, status_code=status.HTTP_201_CREATED)
async def create_poring(
    payload: PoringCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PoringOut:
    poring = Poring(
        title=payload.title,
        description=payload.description,
        user_id=current_user.id,
    )
    db.add(poring)
    await db.commit()
    # Re-fetch with relationships loaded to avoid async lazy-load after commit.
    result = await db.execute(_poring_query().where(Poring.id == poring.id))
    return _to_out(result.scalar_one())


@router.get("/{poring_id}", response_model=PoringOut)
async def get_poring(
    poring_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PoringOut:
    poring = await _get_owned_poring(db, poring_id, current_user)
    return _to_out(poring)


@router.patch("/{poring_id}", response_model=PoringOut)
async def update_poring(
    poring_id: int,
    payload: PoringUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PoringOut:
    poring = await _get_owned_poring(db, poring_id, current_user)
    data = payload.model_dump(exclude_unset=True)

    if "title" in data and data["title"] is not None:
        poring.title = data["title"]

    description_changed = (
        "description" in data and data["description"] != poring.description
    )
    if "description" in data:
        poring.description = data["description"]

    if description_changed:
        await award_xp(db, poring, XPEventType.description_edit, commit=False)

    await db.commit()
    # Re-fetch to load fresh relationship state.
    result = await db.execute(_poring_query().where(Poring.id == poring_id))
    return _to_out(result.scalar_one())


@router.delete("/{poring_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_poring(
    poring_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    poring = await _get_owned_poring(db, poring_id, current_user)
    await db.delete(poring)
    await db.commit()


@router.post("/{poring_id}/act", response_model=PoringOut)
async def act_on_poring(
    poring_id: int,
    payload: ActRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> PoringOut:
    poring = await _get_owned_poring(db, poring_id, current_user)

    if poring.status != PoringStatus.alive:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Poring has already been acted on",
        )
    if poring.xp < RIPE_THRESHOLD:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Poring must be ripe to act — needs {RIPE_THRESHOLD} XP, has {poring.xp}",
        )

    poring.status = PoringStatus.completed
    poring.action_type = ActionType(payload.action_type)
    await db.commit()

    result = await db.execute(_poring_query().where(Poring.id == poring_id))
    return _to_out(result.scalar_one())

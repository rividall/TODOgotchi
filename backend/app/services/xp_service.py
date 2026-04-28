"""XP mutation service.

ALL XP changes MUST go through this module. Routers must never write to
`Poring.xp` directly. The XP event log is the source of truth.
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.poring import Poring, PoringStatus
from app.models.xp_event import XPEvent, XPEventType

XP_PER_EVENT: dict[XPEventType, int] = {
    XPEventType.description_edit: 2,
    XPEventType.checklist_added: 3,
    XPEventType.checklist_completed: 5,
    XPEventType.label_attached: 3,
}


def compute_tier(xp: int) -> str:
    if xp < 0:
        raise ValueError("xp must be non-negative")
    if xp < 10:
        return "seed"
    if xp < 30:
        return "happy"
    if xp < 60:
        return "chubby"
    return "ripe"


async def award_xp(
    db: AsyncSession,
    poring: Poring,
    event_type: XPEventType,
    *,
    commit: bool = True,
) -> XPEvent:
    """Award XP for an event. Writes XPEvent + updates poring.xp atomically.

    Caller is responsible for confirming the poring belongs to the current user.
    Raises 400 if the poring is already completed.
    """
    if poring.status == PoringStatus.completed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed porings cannot receive XP",
        )

    gained = XP_PER_EVENT[event_type]
    if gained < 0:
        raise ValueError("xp_gained must be non-negative")

    poring.xp = max(0, poring.xp + gained)
    event = XPEvent(poring_id=poring.id, event_type=event_type, xp_gained=gained)
    db.add(event)
    await db.flush()
    if commit:
        await db.commit()
        await db.refresh(poring)
        await db.refresh(event)
    return event

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.feedback import Feedback
from app.models.user import User
from app.schemas.feedback import FeedbackAdminOut, FeedbackCreate, FeedbackOut

router = APIRouter(prefix="/api/v1/feedback", tags=["feedback"])


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email.lower() not in settings.admin_emails:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


@router.get("", response_model=list[FeedbackOut])
async def list_feedback(db: AsyncSession = Depends(get_db)) -> list[FeedbackOut]:
    result = await db.execute(
        select(Feedback).order_by(Feedback.created_at.desc()).limit(50)
    )
    return [FeedbackOut.model_validate(f) for f in result.scalars().all()]


@router.post("", response_model=FeedbackOut, status_code=201)
async def create_feedback(
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
) -> FeedbackOut:
    feedback = Feedback(message=payload.message, email=payload.email)
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return FeedbackOut.model_validate(feedback)


@router.get("/admin", response_model=list[FeedbackAdminOut])
async def admin_list_feedback(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> list[FeedbackAdminOut]:
    result = await db.execute(
        select(Feedback).order_by(Feedback.created_at.desc())
    )
    return [FeedbackAdminOut.model_validate(f) for f in result.scalars().all()]


@router.delete("/{feedback_id}", status_code=204)
async def delete_feedback(
    feedback_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> None:
    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    feedback = result.scalar_one_or_none()
    if feedback is None:
        raise HTTPException(status_code=404, detail="Feedback not found")
    await db.delete(feedback)
    await db.commit()

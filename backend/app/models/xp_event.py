from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import DateTime, ForeignKey, Integer
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class XPEventType(str, Enum):
    description_edit = "description_edit"
    checklist_added = "checklist_added"
    checklist_completed = "checklist_completed"
    label_attached = "label_attached"


class XPEvent(Base):
    __tablename__ = "xp_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    poring_id: Mapped[int] = mapped_column(
        ForeignKey("porings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[XPEventType] = mapped_column(
        SAEnum(XPEventType, name="xp_event_type"),
        nullable=False,
    )
    xp_gained: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    poring: Mapped["Poring"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="xp_events"
    )

from datetime import datetime, timezone
from enum import Enum

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PoringStatus(str, Enum):
    alive = "alive"
    completed = "completed"


class ActionType(str, Enum):
    shipped = "shipped"
    booked = "booked"
    bought = "bought"
    done = "done"
    abandoned = "abandoned"


class Poring(Base):
    __tablename__ = "porings"
    __table_args__ = (CheckConstraint("xp >= 0", name="ck_porings_xp_nonneg"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    xp: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[PoringStatus] = mapped_column(
        SAEnum(PoringStatus, name="poring_status"),
        nullable=False,
        default=PoringStatus.alive,
    )
    action_type: Mapped[ActionType | None] = mapped_column(
        SAEnum(ActionType, name="poring_action_type"),
        nullable=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    xp_events: Mapped[list["XPEvent"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="poring", cascade="all, delete-orphan"
    )
    checklist_items: Mapped[list["ChecklistItem"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        back_populates="poring",
        cascade="all, delete-orphan",
        order_by="ChecklistItem.order",
    )
    labels: Mapped[list["Label"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        secondary="porings_labels",
        back_populates="porings",
        order_by="Label.name",
    )

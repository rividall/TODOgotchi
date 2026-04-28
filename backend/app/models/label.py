from sqlalchemy import Column, ForeignKey, Integer, String, Table, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

porings_labels = Table(
    "porings_labels",
    Base.metadata,
    Column("poring_id", Integer, ForeignKey("porings.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", Integer, ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)


class Label(Base):
    __tablename__ = "labels"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_labels_user_name"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(64), nullable=False)
    color: Mapped[str] = mapped_column(String(7), nullable=False)  # hex #RRGGBB
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    porings: Mapped[list["Poring"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        secondary=porings_labels, back_populates="labels"
    )

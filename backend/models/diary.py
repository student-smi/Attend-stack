import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class ClassDiary(Base):
    __tablename__ = "class_diary"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    class_id       = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id     = Column(UUID(as_uuid=True), ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True)
    teacher_id     = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True)
    date           = Column(Date, nullable=False, index=True)
    topics_covered = Column(Text, nullable=False)
    homework       = Column(Text, nullable=True)
    due_date       = Column(Date, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cls     = relationship("Class", foreign_keys=[class_id])
    subject = relationship("Subject", foreign_keys=[subject_id])
    teacher = relationship("Teacher", foreign_keys=[teacher_id])

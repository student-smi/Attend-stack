import uuid
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Quiz(Base):
    __tablename__ = "quizzes"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title            = Column(String(255), nullable=False)
    description      = Column(Text, nullable=True)
    subject          = Column(String(100), nullable=False)
    class_id         = Column(UUID(as_uuid=True), ForeignKey("classes.id", ondelete="CASCADE"), nullable=True, index=True)
    teacher_id       = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True, index=True)
    duration_minutes = Column(Integer, default=15, nullable=False)
    total_marks      = Column(Integer, default=10, nullable=False)
    questions_json   = Column(Text, nullable=False)
    is_active        = Column(Boolean, default=True, nullable=False)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())
    updated_at       = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    cls         = relationship("Class", foreign_keys=[class_id])
    teacher     = relationship("Teacher", foreign_keys=[teacher_id])
    submissions = relationship("QuizSubmission", back_populates="quiz", cascade="all, delete-orphan")


class QuizSubmission(Base):
    __tablename__ = "quiz_submissions"

    id                 = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_id            = Column(UUID(as_uuid=True), ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id         = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    score              = Column(Integer, nullable=False)
    total_marks        = Column(Integer, nullable=False)
    answers_json       = Column(Text, nullable=False)
    time_spent_seconds = Column(Integer, default=0, nullable=False)
    submitted_at       = Column(DateTime(timezone=True), server_default=func.now())

    quiz    = relationship("Quiz", back_populates="submissions")
    student = relationship("Student", foreign_keys=[student_id])

    __table_args__ = (
        UniqueConstraint("quiz_id", "student_id", name="uq_quiz_student"),
    )

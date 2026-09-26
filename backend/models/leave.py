import uuid
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class LeaveRequest(Base):
    __tablename__ = "leave_requests"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    applicant_type = Column(String(20), nullable=False)  # 'student' | 'teacher'
    student_id     = Column(UUID(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True)
    teacher_id     = Column(UUID(as_uuid=True), ForeignKey("teachers.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id        = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    leave_type     = Column(String(50), nullable=False, default="Casual")  # 'Sick', 'Casual', 'Emergency', 'Vacation', 'Other'
    from_date      = Column(Date, nullable=False)
    to_date        = Column(Date, nullable=False)
    reason         = Column(Text, nullable=False)
    status         = Column(String(20), nullable=False, default="Pending", index=True)  # 'Pending', 'Approved', 'Rejected'
    reviewed_by    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    review_remarks = Column(Text, nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())
    updated_at     = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    student  = relationship("Student", foreign_keys=[student_id])
    teacher  = relationship("Teacher", foreign_keys=[teacher_id])
    user     = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewed_by])

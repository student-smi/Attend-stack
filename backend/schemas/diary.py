from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import date, datetime
from uuid import UUID


class ClassDiaryBase(BaseModel):
    class_id:       UUID
    subject_id:     Optional[UUID] = None
    teacher_id:     Optional[UUID] = None
    date:           date
    topics_covered: str
    homework:       Optional[str] = None
    due_date:       Optional[date] = None

    @field_serializer("class_id", "subject_id", "teacher_id")
    def serialize_uuids(self, v): return str(v) if v else None


class ClassDiaryCreate(ClassDiaryBase):
    pass


class ClassDiaryUpdate(BaseModel):
    topics_covered: Optional[str]  = None
    homework:       Optional[str]  = None
    due_date:       Optional[date] = None


class ClassDiaryOut(ClassDiaryBase):
    id:           UUID
    class_name:   Optional[str] = None
    subject_name: Optional[str] = None
    teacher_name: Optional[str] = None
    created_at:   datetime
    updated_at:   datetime

    model_config = {"from_attributes": True}

    @field_serializer("id", "class_id", "subject_id", "teacher_id")
    def serialize_uuids(self, v): return str(v) if v else None

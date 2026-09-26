from sqlalchemy.orm import Session
from models.diary import ClassDiary
from schemas.diary import ClassDiaryCreate, ClassDiaryUpdate
from typing import List, Optional


def _enrich(entry: ClassDiary) -> ClassDiary:
    if not entry:
        return entry
    entry.class_name = f"{entry.cls.name} ({entry.cls.section})" if entry.cls else None
    entry.subject_name = entry.subject.name if entry.subject else None
    entry.teacher_name = entry.teacher.name if entry.teacher else None
    return entry


def get_all(db: Session, skip: int = 0, limit: int = 100) -> List[ClassDiary]:
    records = db.query(ClassDiary).order_by(ClassDiary.date.desc(), ClassDiary.created_at.desc()).offset(skip).limit(limit).all()
    return [_enrich(r) for r in records]


def get_by_class(db: Session, class_id: str, limit: int = 50) -> List[ClassDiary]:
    records = db.query(ClassDiary).filter(ClassDiary.class_id == class_id).order_by(ClassDiary.date.desc(), ClassDiary.created_at.desc()).limit(limit).all()
    return [_enrich(r) for r in records]


def get_by_teacher(db: Session, teacher_id: str, limit: int = 50) -> List[ClassDiary]:
    records = db.query(ClassDiary).filter(ClassDiary.teacher_id == teacher_id).order_by(ClassDiary.date.desc(), ClassDiary.created_at.desc()).limit(limit).all()
    return [_enrich(r) for r in records]


def get_by_id(db: Session, entry_id: str) -> Optional[ClassDiary]:
    obj = db.query(ClassDiary).filter(ClassDiary.id == entry_id).first()
    return _enrich(obj) if obj else None


def create(db: Session, data: ClassDiaryCreate) -> ClassDiary:
    obj = ClassDiary(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return _enrich(obj)


def update(db: Session, entry_id: str, data: ClassDiaryUpdate) -> Optional[ClassDiary]:
    obj = db.query(ClassDiary).filter(ClassDiary.id == entry_id).first()
    if not obj:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return _enrich(obj)


def delete(db: Session, entry_id: str) -> bool:
    obj = db.query(ClassDiary).filter(ClassDiary.id == entry_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True

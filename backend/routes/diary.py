from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas.diary import ClassDiaryCreate, ClassDiaryUpdate, ClassDiaryOut
from crud import diary as crud
from crud import student as student_crud
from crud import teacher as teacher_crud
from auth.dependencies import require_admin, get_current_user, require_teacher_or_admin
from models.user import User

router = APIRouter(prefix="/diary", tags=["Class Diary"])


@router.get("/my", response_model=List[ClassDiaryOut])
def get_my_diary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    If logged-in user is a student: get diary/homework for their class.
    If logged-in user is a teacher: get diary/homework posted by this teacher.
    """
    if current_user.role == "teacher":
        teacher = teacher_crud.get_by_user_id(db, str(current_user.id))
        if not teacher:
            return []
        return crud.get_by_teacher(db, str(teacher.id))
    elif current_user.role == "student":
        student = student_crud.get_by_user_id(db, str(current_user.id))
        if not student or not student.class_id:
            return []
        return crud.get_by_class(db, str(student.class_id))
    else:
        # Admin can view all
        return crud.get_all(db, limit=50)


@router.get("/class/{class_id}", response_model=List[ClassDiaryOut])
def get_class_diary(
    class_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    """Get diary entries for a class."""
    return crud.get_by_class(db, class_id)


@router.get("/", response_model=List[ClassDiaryOut])
def list_diary(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user)
):
    return crud.get_all(db, skip=skip, limit=limit)


@router.post("/", response_model=ClassDiaryOut, status_code=status.HTTP_201_CREATED)
def create_diary(
    data: ClassDiaryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin)
):
    """Add daily homework and class diary entry (Teacher or Admin)."""
    # If teacher_id is not set and current_user is a teacher, set it automatically
    if not data.teacher_id and current_user.role == "teacher":
        t = teacher_crud.get_by_user_id(db, str(current_user.id))
        if t:
            data.teacher_id = t.id
    return crud.create(db, data)


@router.put("/{entry_id}", response_model=ClassDiaryOut)
def update_diary(
    entry_id: str,
    data: ClassDiaryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin)
):
    obj = crud.update(db, entry_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Diary entry not found")
    return obj


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diary(
    entry_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin)
):
    if not crud.delete(db, entry_id):
        raise HTTPException(status_code=404, detail="Diary entry not found")

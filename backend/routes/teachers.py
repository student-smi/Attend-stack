from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from schemas.teacher import TeacherCreate, TeacherUpdate, TeacherOut, TeacherCreatedOut
from crud import teacher as crud
from auth.dependencies import require_admin, get_current_user
from auth.password import hash_password
from models.user import User


class PasswordChange(BaseModel):
    new_password: str

router = APIRouter(prefix="/teachers", tags=["Teachers"])


@router.get("/me", response_model=TeacherOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get logged-in teacher's profile."""
    obj = crud.get_by_user_id(db, str(current_user.id))
    if not obj:
        raise HTTPException(status_code=404, detail="Teacher profile not found")
    return obj


@router.get("/", response_model=List[TeacherOut])
def list_teachers(
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    return crud.get_all(db, skip=skip, limit=limit)


@router.post("/", response_model=TeacherCreatedOut, status_code=status.HTTP_201_CREATED)
def create_teacher(
    data: TeacherCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    if data.email:
        existing = crud.get_by_email(db, data.email)
        if existing:
            raise HTTPException(status_code=400, detail="A teacher with this email already exists.")
    teacher, plain_password = crud.create(db, data)
    # Build response with initial_password
    out = TeacherCreatedOut.model_validate(teacher)
    out.initial_password = plain_password
    return out


@router.get("/{teacher_id}", response_model=TeacherOut)
def get_teacher(
    teacher_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    obj = crud.get_by_id(db, teacher_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return obj


@router.put("/{teacher_id}", response_model=TeacherOut)
def update_teacher(
    teacher_id: str,
    data: TeacherUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    obj = crud.update(db, teacher_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Teacher not found")
    return obj


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_teacher(
    teacher_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    success = crud.delete(db, teacher_id)
    if not success:
        raise HTTPException(status_code=404, detail="Teacher not found")


@router.patch("/{teacher_id}/change-password", tags=["Teachers"])
def change_teacher_password(
    teacher_id: str,
    body: PasswordChange,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Change a teacher's login password (Admin only)."""
    teacher = crud.get_by_id(db, teacher_id)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    if not body.new_password or len(body.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")

    new_pass_hashed = hash_password(body.new_password.strip())

    user = db.query(User).filter(User.id == teacher.user_id).first() if teacher.user_id else None
    if not user:
        if not teacher.email:
            raise HTTPException(status_code=400, detail="Teacher has no email address to create a login account")
        user = User(
            email=teacher.email,
            password=new_pass_hashed,
            role="teacher",
            is_active=True
        )
        db.add(user)
        db.flush()
        teacher.user_id = user.id
        db.commit()
        return {"message": "Login account created and password set successfully", "email": user.email}

    user.password = new_pass_hashed
    db.commit()
    return {"message": "Password updated successfully", "email": user.email}


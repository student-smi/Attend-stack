from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from database import get_db
from schemas.student import StudentCreate, StudentUpdate, StudentOut, StudentCreatedOut
from crud import student as crud
from auth.dependencies import require_admin, get_current_user
from auth.password import hash_password
from models.user import User


class PasswordChange(BaseModel):
    new_password: str

router = APIRouter(prefix="/students", tags=["Students"])


@router.get("/", response_model=List[StudentOut])
def list_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """List all students (Admin only)."""
    return crud.get_all(db, skip=skip, limit=limit)


@router.get("/me", response_model=StudentOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the logged-in student's profile."""
    student = crud.get_by_user_id(db, str(current_user.id))
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student


@router.get("/{student_id}", response_model=StudentOut)
def get_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Get a student by ID (Admin only)."""
    student = crud.get_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.post("/", response_model=StudentCreatedOut, status_code=status.HTTP_201_CREATED)
def create_student(
    data: StudentCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Create a new student with login account (Admin only)."""
    student, plain_password = crud.create(db, data)
    return StudentCreatedOut(
        **StudentOut.model_validate(student).model_dump(),
        initial_password=plain_password,
    )


@router.put("/{student_id}", response_model=StudentOut)
def update_student(
    student_id: str,
    data: StudentUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Update a student (Admin only)."""
    student = crud.update(db, student_id, data)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_student(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Delete a student (Admin only)."""
    success = crud.delete(db, student_id)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")


@router.patch("/{student_id}/change-password", tags=["Students"])
def change_student_password(
    student_id: str,
    body: PasswordChange,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """Change a student's login password (Admin only)."""
    student = crud.get_by_id(db, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    if not student.user_id:
        raise HTTPException(status_code=400, detail="This student has no login account")
    user = db.query(User).filter(User.id == student.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Login account not found")
    if not body.new_password or len(body.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    user.password = hash_password(body.new_password.strip())
    db.commit()
    return {"message": "Password updated successfully", "email": user.email}

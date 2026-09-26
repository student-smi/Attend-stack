from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas.attendance import AttendanceCreate, AttendanceUpdate, AttendanceOut, BulkAttendanceCreate
from crud import attendance as crud
from crud import student as student_crud
from auth.dependencies import require_admin, get_current_user, require_teacher_or_admin
from models.user import User

router = APIRouter(prefix="/attendance", tags=["Attendance"])


@router.post("/bulk", response_model=List[AttendanceOut], status_code=status.HTTP_201_CREATED)
def mark_bulk_attendance(
    data: BulkAttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_teacher_or_admin)
):
    """Mark attendance for all students in a class at once (Teacher or Admin)."""
    return crud.bulk_create(db, data, marked_by=str(current_user.id))


@router.get("/class/{class_id}", response_model=List[AttendanceOut])
def get_class_attendance(
    class_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher_or_admin)
):
    """Get all attendance records for a class (Teacher or Admin)."""
    return crud.get_by_class(db, class_id)


@router.get("/", response_model=List[AttendanceOut])
def list_attendance(
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    """List all attendance records (Admin only)."""
    return crud.get_all(db, skip=skip, limit=limit)


@router.get("/me", response_model=List[AttendanceOut])
def get_my_attendance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get the logged-in student's attendance."""
    student = student_crud.get_by_user_id(db, str(current_user.id))
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return crud.get_by_student(db, str(student.id))


@router.get("/student/{student_id}", response_model=List[AttendanceOut])
def get_student_attendance(
    student_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    return crud.get_by_student(db, student_id)


@router.get("/{attendance_id}", response_model=AttendanceOut)
def get_attendance(
    attendance_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    obj = crud.get_by_id(db, attendance_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return obj


@router.post("/", response_model=AttendanceOut, status_code=status.HTTP_201_CREATED)
def mark_attendance(
    data: AttendanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Mark attendance for a student (Admin only)."""
    return crud.create(db, data, marked_by=str(current_user.id))


@router.put("/{attendance_id}", response_model=AttendanceOut)
def update_attendance(
    attendance_id: str,
    data: AttendanceUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    obj = crud.update(db, attendance_id, data)
    if not obj:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    return obj


@router.delete("/{attendance_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_attendance(
    attendance_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin)
):
    success = crud.delete(db, attendance_id)
    if not success:
        raise HTTPException(status_code=404, detail="Attendance record not found")

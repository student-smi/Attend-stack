from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from auth.password import verify_password
from models.user import User
from schemas.auth import LoginRequest, TokenResponse
from auth.jwt_handler import create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


from pydantic import BaseModel
from auth.dependencies import get_current_user
from auth.password import hash_password, verify_password


class SelfPasswordChange(BaseModel):
    old_password: str
    new_password: str


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = db.query(User).filter(
        User.email == request.email,
        User.is_active == True
    ).first()

    if not user or not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role})
    return TokenResponse(
        access_token=token,
        role=user.role,
        user_id=str(user.id)
    )


@router.post("/change-password")
def change_own_password(
    body: SelfPasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change the logged-in user's own password."""
    if not verify_password(body.old_password, current_user.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if not body.new_password or len(body.new_password.strip()) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")

    current_user.password = hash_password(body.new_password.strip())
    db.commit()
    return {"message": "Password changed successfully"}


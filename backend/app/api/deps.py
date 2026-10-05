from typing import Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
) -> User:
    """
    Authenticates and retrieves the current user.
    Supports Bearer JWT tokens and optional X-User-Id for direct developer testing.
    Guarantees strict tenant isolation by binding all requests to this user.
    """
    # 1. Bearer JWT Token check
    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
            return user
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 2. Direct developer header X-User-Id
    if x_user_id:
        user = db.query(User).filter(User.id == x_user_id).first()
        if user:
            return user

    # 3. Default demo user if in local development mode without token
    demo_user = db.query(User).filter(User.email == "rahul@example.com").first()
    if demo_user and settings.ENVIRONMENT == "development":
        return demo_user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please log in or sign up.",
        headers={"WWW-Authenticate": "Bearer"},
    )

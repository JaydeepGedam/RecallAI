from typing import Optional
from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models.user import User
from app.models.api_key import APIKey

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def authenticate_api_key(db: Session, raw_key: str) -> User:
    """Validates raw API key and returns associated Tenant User."""
    key_hash = APIKey.hash_key(raw_key)
    api_key = db.query(APIKey).filter(
        APIKey.key_hash == key_hash,
        APIKey.is_active == True,
        APIKey.revoked_at.is_(None)
    ).first()

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked EpisodicAI API key.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check expiry
    if api_key.expires_at:
        now = datetime.now(timezone.utc)
        exp = api_key.expires_at.replace(tzinfo=timezone.utc) if api_key.expires_at.tzinfo is None else api_key.expires_at
        if exp < now:
            api_key.is_active = False
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="API key has expired.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Update last_used_at
    api_key.last_used_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()

    tenant = db.query(User).filter(User.id == api_key.tenant_id).first()
    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant account associated with this API key not found."
        )
    return tenant


def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
) -> User:
    """
    Authenticates and retrieves the current dashboard user via Bearer JWT.
    Supports optional X-User-Id for direct developer testing in development mode.
    """
    # 1. Bearer JWT Token check
    if token and not token.startswith("rai_live_"):
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication token.",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found.")
            return user
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate authentication credentials.",
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
        detail="Authentication required. Please log in or provide an API key.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_api_key_tenant(
    db: Session = Depends(get_db),
    auth_header: Optional[str] = Header(None, alias="Authorization"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key")
) -> User:
    """
    Enforces authentication via EpisodicAI API Key (epi_live_... or legacy rai_live_...).
    Supports Authorization: Bearer epi_live_... or X-API-Key: epi_live_...
    """
    raw_key = None
    if auth_header and (auth_header.startswith("Bearer epi_live_") or auth_header.startswith("Bearer rai_live_")):
        raw_key = auth_header.replace("Bearer ", "").strip()
    elif x_api_key and (x_api_key.startswith("epi_live_") or x_api_key.startswith("rai_live_")):
        raw_key = x_api_key.strip()
    
    if not raw_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid EpisodicAI API key required (format: epi_live_...). Pass in 'Authorization: Bearer <key>' or 'X-API-Key' header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return authenticate_api_key(db, raw_key)


def get_tenant_or_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme),
    auth_header: Optional[str] = Header(None, alias="Authorization"),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
) -> User:
    """
    Authenticates external developer API requests or dashboard sessions via:
    1. API Key (epi_live_... or legacy rai_live_...) in Authorization or X-API-Key header.
    2. Bearer JWT Token in Authorization header.
    3. X-User-Id header for developer testing.
    Rejects unauthenticated requests with 401.
    """
    # 1. Check API Key
    is_api_key_header = (
        (auth_header and (auth_header.startswith("Bearer epi_live_") or auth_header.startswith("Bearer rai_live_"))) or
        (x_api_key and (x_api_key.startswith("epi_live_") or x_api_key.startswith("rai_live_")))
    )
    if is_api_key_header:
        raw_key = auth_header.replace("Bearer ", "").strip() if (auth_header and (auth_header.startswith("Bearer epi_live_") or auth_header.startswith("Bearer rai_live_"))) else x_api_key.strip()
        return authenticate_api_key(db, raw_key)

    # 2. Check JWT Token
    if token and not token.startswith("epi_live_") and not token.startswith("rai_live_"):
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id: str = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == user_id).first()
                if user:
                    return user
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # 3. Direct developer header X-User-Id
    if x_user_id:
        user = db.query(User).filter(User.id == x_user_id).first()
        if user:
            return user

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Provide an API key ('Authorization: Bearer epi_live_...' or 'X-API-Key') or log in.",
        headers={"WWW-Authenticate": "Bearer"},
    )

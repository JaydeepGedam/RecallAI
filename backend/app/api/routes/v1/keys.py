from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.api_key import APIKey
from app.schemas.api_key import APIKeyCreate, APIKeyResponse, APIKeyCreatedResponse

router = APIRouter(prefix="/keys", tags=["Developer API Keys"])


@router.get("", response_model=List[APIKeyResponse])
def list_api_keys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all API keys generated for the authenticated tenant.
    Raw keys are never returned; only the safe key_prefix is exposed.
    """
    keys = db.query(APIKey).filter(
        APIKey.tenant_id == current_user.id,
        APIKey.is_active == True,
        APIKey.revoked_at.is_(None)
    ).order_by(APIKey.created_at.desc()).all()
    return [APIKeyResponse.model_validate(k) for k in keys]


@router.post("", response_model=APIKeyCreatedResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    req: APIKeyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a new cryptographically secure API key for the tenant (format: rai_live_...).
    IMPORTANT: The full raw API key is returned ONLY ONCE in this response.
    Save it immediately, as it cannot be recovered later!
    """
    key_instance, raw_key = APIKey.generate_key(
        tenant_id=current_user.id,
        name=req.name or "Default API Key"
    )
    db.add(key_instance)
    db.commit()
    db.refresh(key_instance)

    return APIKeyCreatedResponse(
        id=key_instance.id,
        tenant_id=key_instance.tenant_id,
        name=key_instance.name,
        key_prefix=key_instance.key_prefix,
        api_key=raw_key,
        created_at=key_instance.created_at
    )


@router.delete("/{key_id}")
def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Revokes an API key. Once revoked, requests using this key will immediately fail.
    """
    key_instance = db.query(APIKey).filter(
        APIKey.id == key_id,
        APIKey.tenant_id == current_user.id
    ).first()

    if not key_instance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found or not owned by this tenant."
        )

    key_instance.is_active = False
    key_instance.revoked_at = datetime.now(timezone.utc)
    db.add(key_instance)
    db.commit()

    return {"success": True, "message": "API key successfully revoked.", "key_id": key_id}

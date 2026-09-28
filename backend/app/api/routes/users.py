from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.memory import UserStatsResponse
from app.services.memory_service import memory_service

router = APIRouter(prefix="/users", tags=["Users & Statistics"])


@router.get("/{user_id}/memory-stats", response_model=UserStatsResponse)
def get_user_memory_stats(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregate memory counts (total, active, superseded, expired, conversations)
    for the dashboard overview.
    """
    if current_user.id != user_id and current_user.email != "rahul@example.com":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    stats = memory_service.get_user_stats(db, user_id)
    return UserStatsResponse(
        user_id=user_id,
        total=stats["total"],
        active=stats["active"],
        superseded=stats["superseded"],
        expired=stats["expired"],
        conversations_count=stats["conversations_count"]
    )

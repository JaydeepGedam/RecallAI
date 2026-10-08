from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class APIKeyCreate(BaseModel):
    name: Optional[str] = Field("Default API Key", description="Friendly name describing key usage (e.g., 'Production App', 'Local Dev')")


class APIKeyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    name: str
    key_prefix: str
    created_at: datetime
    last_used_at: Optional[datetime] = None
    is_active: bool


class APIKeyCreatedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    tenant_id: str
    name: str
    key_prefix: str
    api_key: str = Field(..., description="Full raw API key. Shown only once upon creation!")
    created_at: datetime

from typing import Optional, Any
from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    version: str
    environment: str
    database: str


class StandardResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Any] = None

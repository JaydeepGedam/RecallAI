from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.models.message import MessageRole


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: MessageRole
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationBase(BaseModel):
    title: str = "New Conversation"


class ConversationCreate(ConversationBase):
    user_id: str


class ConversationResponse(ConversationBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    messages: Optional[List[MessageResponse]] = None

    model_config = ConfigDict(from_attributes=True)

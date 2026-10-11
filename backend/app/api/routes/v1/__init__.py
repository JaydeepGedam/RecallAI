from fastapi import APIRouter
from app.api.routes.v1 import context, process, memories, keys, chat

v1_router = APIRouter()

# Mount all v1 sub-routers
v1_router.include_router(chat.router)
v1_router.include_router(context.router)
v1_router.include_router(process.router)
v1_router.include_router(memories.router)
v1_router.include_router(keys.router)


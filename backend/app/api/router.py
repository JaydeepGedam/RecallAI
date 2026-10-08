from fastapi import APIRouter
from app.api.routes import health, auth, memories, chat, users, demo
from app.api.routes.v1 import keys

api_router = APIRouter()

# Mount all endpoint modules
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(memories.router)
api_router.include_router(chat.router)
api_router.include_router(users.router)
api_router.include_router(demo.router)
api_router.include_router(keys.router)

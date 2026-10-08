import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import logger
from app.db.session import init_db
from app.api.router import api_router
from app.api.routes.v1 import v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown lifecycle manager.
    Initializes PostgreSQL pgvector extension and creates database schema.
    """
    logger.info("Initializing EpisodicAI application...")
    try:
        init_db()
        logger.info("EpisodicAI database schema initialized successfully.")
    except Exception as e:
        logger.critical(f"Database initialization failed: {e}", exc_info=True)
    yield
    logger.info("Shutting down EpisodicAI application.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="EpisodicAI — Autonomous Cognitive Memory Infrastructure (Engine, pgvector Retrieval, API & Dashboard)",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def logging_and_timing_middleware(request: Request, call_next):
    """
    Logs API requests with duration and HTTP status, preventing sensitive header leaks.
    """
    start_time = time.time()
    method = request.method
    path = request.url.path

    try:
        response = await call_next(request)
        process_time = (time.time() - start_time) * 1000
        logger.info(f"{method} {path} - {response.status_code} ({process_time:.2f}ms)")
        return response
    except Exception as exc:
        process_time = (time.time() - start_time) * 1000
        logger.error(f"{method} {path} - FAILED with unhandled exception ({process_time:.2f}ms): {exc}", exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "message": "An internal server error occurred. Please contact system administrator.",
                "detail": str(exc) if settings.DEBUG else None
            }
        )


# Mount API routers
app.include_router(api_router, prefix=settings.API_V1_STR)
app.include_router(v1_router, prefix="/api/v1")


@app.get("/")
def root():
    """
    Root endpoint returning service identity and documentation pointers.
    """
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings


def _run_migrations() -> None:
    """Run Alembic migrations on startup (no-op if already at head)."""
    import subprocess

    try:
        subprocess.run(
            ["python", "-m", "alembic", "upgrade", "head"],
            check=True,
            capture_output=True,
        )
    except Exception:
        pass  # Skip if alembic isn't available (e.g. during tests)


@asynccontextmanager
async def lifespan(app: FastAPI):
    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    _run_migrations()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded files
_upload_path = Path(settings.UPLOAD_DIR)
_upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_upload_path), name="uploads")

from app.routers.admin import router as admin_router
from app.routers.auth import router as auth_router
from app.routers.checklist import router as checklist_router
from app.routers.feedback import router as feedback_router
from app.routers.labels import router as labels_router
from app.routers.porings import router as porings_router

app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(porings_router)
app.include_router(checklist_router)
app.include_router(labels_router)
app.include_router(feedback_router)


@app.get("/health")
async def health():
    return {"status": "healthy", "version": settings.APP_VERSION}

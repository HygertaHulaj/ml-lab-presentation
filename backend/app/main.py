from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.v1.concepts import router as concepts_router
from .api.v1.lessons import router as lessons_router
from .api.v1.routes import ROUTERS
from .core.config import get_settings
from .core.database import Base, get_engine, sessionmaker
from .core.exceptions import register_exception_handlers
from .models import entities, lessons  # noqa: F401  (register tables)
from .services import dataset_service, exercise_service, simulation_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    if settings.auto_create_tables:
        async with get_engine().begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    async with sessionmaker()() as session:
        await dataset_service.seed_builtin(session)
        await exercise_service.sync_catalogue(session)
        await simulation_service.sync_lessons(session)
    yield
    await get_engine().dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan,
                  description="Explainable machine-learning laboratory for DS4A Ch. 8 and HoIDS Ch. 8. "
                              "All metrics and explanations are computed from real model training.")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_origin_regex=settings.cors_origin_regex,
                       allow_methods=["*"], allow_headers=["*"])
    register_exception_handlers(app)
    # lessons first: GET /datasets/iris must win over GET /datasets/{dataset_id}
    for r in [lessons_router, concepts_router, *ROUTERS]:
        app.include_router(r, prefix="/api/v1")

    @app.get("/api/health", tags=["health"])
    async def health():
        return {"status": "ok"}

    return app


app = create_app()

from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.core.config import settings
from app.models.database import init_db

# Import routers
from app.api.routes.projects import router as projects_router
from app.api.routes.uploads import router as uploads_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.business_rules import router as rules_router
from app.api.routes.dependencies import router as dependencies_router
from app.api.routes.modernization import router as modernization_router
from app.api.routes.verification import router as verification_router
from app.api.routes.replanning import router as replanning_router
from app.api.routes.reports import router as reports_router
from app.api.routes.benchmark import router as benchmark_router
from app.api.routes.settings_api import router as settings_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Autonomous, Evidence-Driven Legacy Application Modernization Agent"
)

# Enable CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "provider": settings.AI_PROVIDER
    }

# Register all API routes under API_V1_PREFIX
app.include_router(projects_router, prefix=settings.API_V1_PREFIX)
app.include_router(uploads_router, prefix=settings.API_V1_PREFIX)
app.include_router(analysis_router, prefix=settings.API_V1_PREFIX)
app.include_router(rules_router, prefix=settings.API_V1_PREFIX)
app.include_router(dependencies_router, prefix=settings.API_V1_PREFIX)
app.include_router(modernization_router, prefix=settings.API_V1_PREFIX)
app.include_router(verification_router, prefix=settings.API_V1_PREFIX)
app.include_router(replanning_router, prefix=settings.API_V1_PREFIX)
app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
app.include_router(benchmark_router, prefix=settings.API_V1_PREFIX)
app.include_router(settings_router, prefix=settings.API_V1_PREFIX)

# Serve built frontend single-page application if dist exists
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "health":
            return None
        file_path = frontend_dist / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(frontend_dist / "index.html"))

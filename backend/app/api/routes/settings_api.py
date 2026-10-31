from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.core.config import settings
from app.llm.provider import llm_provider

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingsUpdate(BaseModel):
    AI_PROVIDER: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: Optional[str] = None

@router.get("")
def get_current_settings():
    info = llm_provider.get_active_provider_info()
    return {
        "project_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_provider": settings.AI_PROVIDER,
        "active_provider_info": info,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "gemini_model": settings.GEMINI_MODEL,
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "openai_model": settings.OPENAI_MODEL,
        "limits": {
            "max_upload_mb": settings.MAX_UPLOAD_MB,
            "max_extracted_mb": settings.MAX_EXTRACTED_MB,
            "max_files": settings.MAX_FILE_COUNT,
            "sandbox_timeout_sec": settings.SANDBOX_TIMEOUT_SEC
        }
    }

@router.post("")
def update_settings(update: SettingsUpdate):
    if update.AI_PROVIDER is not None:
        settings.AI_PROVIDER = update.AI_PROVIDER
    if update.GEMINI_API_KEY is not None:
        settings.GEMINI_API_KEY = update.GEMINI_API_KEY
    if update.GEMINI_MODEL is not None:
        settings.GEMINI_MODEL = update.GEMINI_MODEL
    if update.OPENAI_API_KEY is not None:
        settings.OPENAI_API_KEY = update.OPENAI_API_KEY
    if update.OPENAI_MODEL is not None:
        settings.OPENAI_MODEL = update.OPENAI_MODEL

    llm_provider._init_clients()
    return {"status": "updated", "active_provider": llm_provider.get_active_provider_info()}

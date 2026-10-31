import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    PROJECT_NAME: str = "LegacyLens AI"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api/v1"
    
    # Storage Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    STORAGE_DIR: Path = BASE_DIR / "storage"
    UPLOAD_DIR: Path = STORAGE_DIR / "uploads"
    WORKSPACE_DIR: Path = STORAGE_DIR / "workspaces"
    REPORTS_DIR: Path = STORAGE_DIR / "reports"
    
    # Database
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'legacylens.db'}"
    
    # Limits & Security
    MAX_UPLOAD_MB: int = 100
    MAX_EXTRACTED_MB: int = 500
    MAX_FILE_COUNT: int = 3000
    SANDBOX_TIMEOUT_SEC: int = 30
    
    # AI Providers (Configurable via env)
    AI_PROVIDER: str = "auto"  # 'gemini', 'openai', 'heuristic' / 'auto'
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"

settings = Settings()

# Ensure directories exist safely
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.WORKSPACE_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORTS_DIR.mkdir(parents=True, exist_ok=True)

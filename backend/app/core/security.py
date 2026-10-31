import os
import re
from pathlib import Path
from typing import List, Tuple
from fastapi import HTTPException, status

class SecurityError(Exception):
    pass

SECRET_PATTERNS = [
    re.compile(r'(?i)(api[_-]?key|secret|password|auth[_-]?token|bearer|private[_-]?key)\s*[:=]\s*["\']?([^"\'\s]{8,})["\']?'),
    re.compile(r'(?i)AIza[0-9A-Za-z-_]{28,}'),  # Google API key format
    re.compile(r'(?i)sk-[a-zA-Z0-9]{24,}'),    # OpenAI key format
]

def mask_secrets(text: str) -> str:
    """Mask sensitive keys and passwords in text, code, or logs."""
    masked = text
    for pattern in SECRET_PATTERNS:
        def repl(match):
            full = match.group(0)
            if match.lastindex and match.lastindex >= 2:
                secret_val = match.group(2)
                redacted = secret_val[:3] + "..." + secret_val[-3:] if len(secret_val) > 6 else "[REDACTED]"
                return full.replace(secret_val, redacted)
            return "[REDACTED_SECRET]"
        masked = pattern.sub(repl, masked)
    return masked

def validate_safe_path(target_directory: Path, untrusted_filename: str) -> Path:
    """
    Prevent Zip-Slip / Path Traversal attacks.
    Ensures that resolved path stays strictly within target_directory.
    """
    resolved_dir = target_directory.resolve()
    # Normalize separators
    clean_name = untrusted_filename.replace("\\", "/").lstrip("/")
    destination = (resolved_dir / clean_name).resolve()
    
    if not str(destination).startswith(str(resolved_dir)):
        raise SecurityError(f"Path traversal detected: {untrusted_filename} attempts to escape sandbox")
    
    return destination

def validate_archive_stats(file_count: int, total_uncompressed_bytes: int, max_files: int, max_bytes: int):
    """
    Prevent Zip bombs or excessive archives.
    """
    if file_count > max_files:
        raise SecurityError(f"Archive exceeds maximum file count limit ({file_count} > {max_files})")
    if total_uncompressed_bytes > max_bytes:
        mb = total_uncompressed_bytes / (1024 * 1024)
        max_mb = max_bytes / (1024 * 1024)
        raise SecurityError(f"Archive uncompressed size ({mb:.1f} MB) exceeds limit ({max_mb:.1f} MB)")

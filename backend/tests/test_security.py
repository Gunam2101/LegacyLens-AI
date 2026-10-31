import pytest
from pathlib import Path
from app.core.security import validate_safe_path, validate_archive_stats, mask_secrets, SecurityError

def test_zip_slip_prevention(tmp_path):
    target = tmp_path / "sandbox"
    target.mkdir()
    
    # Safe relative paths
    safe = validate_safe_path(target, "src/billing.py")
    assert safe == target / "src" / "billing.py"
    
    # Dangerous path traversal attacks
    with pytest.raises(SecurityError, match="Path traversal detected"):
        validate_safe_path(target, "../../etc/passwd")
        
    with pytest.raises(SecurityError, match="Path traversal detected"):
        validate_safe_path(target, "..\\..\\windows\\system32\\cmd.exe")

def test_archive_limits_prevention():
    # File count limit
    with pytest.raises(SecurityError, match="maximum file count"):
        validate_archive_stats(file_count=5000, total_uncompressed_bytes=1000, max_files=1000, max_bytes=1000000)
        
    # Uncompressed byte size limit
    with pytest.raises(SecurityError, match="uncompressed size"):
        validate_archive_stats(file_count=10, total_uncompressed_bytes=600 * 1024 * 1024, max_files=1000, max_bytes=500 * 1024 * 1024)

def test_secret_masking():
    raw = 'api_key: "sk-1234567890abcdef1234567890abcdef" and AIzaSyD12345678901234567890123456789'
    masked = mask_secrets(raw)
    assert "sk-1234567890abcdef1234567890abcdef" not in masked
    assert "AIzaSyD" not in masked
    assert "[REDACTED" in masked or "..." in masked

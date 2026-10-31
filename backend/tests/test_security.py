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
    raw = 'api_key: "sk-1234567890abcdef1234567890abcdef" and AIzaSyD12345678901234567890123456789 and ghp_123456789012345678901234567890123456'
    masked = mask_secrets(raw)
    assert "sk-1234567890abcdef1234567890abcdef" not in masked
    assert "AIzaSyD" not in masked
    assert "ghp_123456789012345678901234567890123456" not in masked
    assert "[REDACTED" in masked or "..." in masked

def test_ssrf_protection():
    from app.core.security import validate_and_normalize_url

    # Block localhost and loopback
    with pytest.raises(SecurityError, match="blocked for security"):
        validate_and_normalize_url("http://localhost:8000")

    with pytest.raises(SecurityError, match="blocked for security"):
        validate_and_normalize_url("http://127.0.0.1/admin")

    with pytest.raises(SecurityError, match="blocked for security"):
        validate_and_normalize_url("http://169.254.169.254/latest/meta-data")

    # Block invalid schemes
    with pytest.raises(SecurityError, match="Prohibited URL scheme"):
        validate_and_normalize_url("ftp://example.com/file")

    with pytest.raises(SecurityError, match="Prohibited URL scheme"):
        validate_and_normalize_url("file:///etc/passwd")

    # Block embedded credentials
    with pytest.raises(SecurityError, match="embedded authentication"):
        validate_and_normalize_url("http://admin:secret@example.com")

def test_git_url_validation():
    from app.services.git_service import GitService

    valid = GitService.validate_repo_url("https://github.com/torvalds/linux.git")
    assert valid == "https://github.com/torvalds/linux.git"

    # Flag injection prevention
    with pytest.raises(SecurityError, match="Invalid characters or flag injection"):
        GitService.validate_repo_url("--upload-pack=evil")

    # Shell command injection prevention
    with pytest.raises(SecurityError, match="Invalid characters or flag injection"):
        GitService.validate_repo_url("https://github.com/repo; rm -rf /")

    # Unsupported protocol
    with pytest.raises(SecurityError, match="Unsupported Git protocol"):
        GitService.validate_repo_url("ssh://git@github.com/user/repo.git")

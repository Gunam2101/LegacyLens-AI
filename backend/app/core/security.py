import os
import re
import socket
import ipaddress
from urllib.parse import urlparse
from pathlib import Path
from typing import List, Tuple
from fastapi import HTTPException, status

class SecurityError(Exception):
    pass

SECRET_PATTERNS = [
    re.compile(r'(?i)(api[_-]?key|secret|password|auth[_-]?token|bearer|private[_-]?key|ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9_]{82})\s*[:=]\s*["\']?([^"\'\s]{8,})["\']?'),
    re.compile(r'(?i)AIza[0-9A-Za-z-_]{28,}'),  # Google API key format
    re.compile(r'(?i)sk-[a-zA-Z0-9]{24,}'),    # OpenAI key format
    re.compile(r'ghp_[a-zA-Z0-9]{36}'),        # GitHub personal access token format
    re.compile(r'github_pat_[a-zA-Z0-9_]{82}'), # GitHub fine-grained token format
]

BLOCKED_HOSTNAMES = {
    "localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal",
    "instance-data", "169.254.169.254"
}

def mask_secrets(text: str) -> str:
    """Mask sensitive keys, tokens, and passwords in text, code, or logs."""
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

def is_ip_private_or_restricted(ip_str: str) -> bool:
    """Check if an IP address is private, loopback, link-local, multicast, or reserved."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return (
            ip.is_private or
            ip.is_loopback or
            ip.is_link_local or
            ip.is_multicast or
            ip.is_reserved or
            ip.is_unspecified or
            str(ip).startswith("169.254.") # Cloud metadata
        )
    except ValueError:
        return True

def validate_and_normalize_url(raw_url: str) -> str:
    """
    Validate website URL against SSRF attacks and normalize it.
    Ensures safe public schemes and verifies that DNS does not resolve to private or cloud metadata IPs.
    """
    if not raw_url or not isinstance(raw_url, str):
        raise SecurityError("URL cannot be empty")

    url = raw_url.strip()
    if "://" not in url:
        url = "https://" + url

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise SecurityError(f"Prohibited URL scheme: {parsed.scheme}. Only HTTP and HTTPS are permitted.")

    if not parsed.hostname:
        raise SecurityError("URL must contain a valid domain or host name.")

    # Reject embedded user:pass credentials in URL
    if parsed.username or parsed.password:
        raise SecurityError("URLs containing embedded authentication credentials are not permitted.")

    hostname = parsed.hostname.lower()
    if hostname in BLOCKED_HOSTNAMES or hostname.endswith(".local") or hostname.endswith(".internal") or hostname.endswith(".lan"):
        raise SecurityError(f"Access to internal host '{hostname}' is blocked for security (SSRF prevention).")

    # Resolve hostname via DNS and check all resolved IPs
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        resolved_ips = {item[4][0] for item in addr_info}
    except socket.gaierror:
        raise SecurityError(f"Could not resolve host '{hostname}'. Please check that domain exists.")
    except Exception as e:
        raise SecurityError(f"DNS validation error for '{hostname}': {str(e)}")

    for ip in resolved_ips:
        if is_ip_private_or_restricted(ip):
            raise SecurityError(
                f"URL resolves to restricted/internal IP address ({ip}). External public addresses only."
            )

    return url

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

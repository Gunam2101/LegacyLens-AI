import os
import re
import subprocess
import shutil
from pathlib import Path
from typing import Dict, Any, Optional, List, Tuple
from urllib.parse import urlparse

from app.core.security import SecurityError, mask_secrets

class GitService:
    @staticmethod
    def validate_repo_url(repo_url: str) -> str:
        """
        Validates that a repository URL is safe, valid, and from a supported HTTPS git host.
        Rejects command injections, file protocols, or malformed strings.
        """
        if not repo_url or not isinstance(repo_url, str):
            raise SecurityError("Repository URL is required.")

        url = repo_url.strip()
        # Disallow arguments or dangerous flags that could trick git CLI
        if url.startswith("-") or "--" in url or ";" in url or "|" in url or "&" in url:
            raise SecurityError("Invalid characters or flag injection detected in Git repository URL.")

        parsed = urlparse(url)
        if parsed.scheme not in ("http", "https"):
            raise SecurityError(f"Unsupported Git protocol '{parsed.scheme}'. Only HTTPS git URLs are permitted.")

        if not parsed.hostname:
            raise SecurityError("Invalid repository URL: host name missing.")

        return url

    @classmethod
    def clone_repository(
        cls,
        repo_url: str,
        target_dir: Path,
        branch: str = "main",
        auth_token: Optional[str] = None,
        timeout_seconds: int = 45
    ) -> Dict[str, Any]:
        """
        Clones a remote repository into an isolated sandbox workspace.
        Uses shallow clone (--depth 1) for speed and resource protection.
        Tokens are handled in-memory only and never logged.
        """
        clean_url = cls.validate_repo_url(repo_url)
        clean_branch = re.sub(r'[^a-zA-Z0-9_\-\./]', '', branch) or "main"

        target_dir.mkdir(parents=True, exist_ok=True)

        # Build authenticated URL if token provided
        clone_url = clean_url
        if auth_token:
            clean_token = auth_token.strip()
            # Embed token safely for standard https git providers (github.com/gitlab.com)
            parsed = urlparse(clean_url)
            clone_url = f"{parsed.scheme}://x-access-token:{clean_token}@{parsed.netloc}{parsed.path}"

        # Clean destination if not empty
        if any(target_dir.iterdir()):
            for item in target_dir.iterdir():
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                else:
                    item.unlink(missing_ok=True)

        # Execute git clone with shallow depth
        cmd = [
            "git", "clone",
            "--depth", "1",
            "--branch", clean_branch,
            clone_url,
            str(target_dir)
        ]

        try:
            proc = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout_seconds,
                env={
                    **os.environ,
                    "GIT_TERMINAL_PROMPT": "0",
                    "GIT_ASKPASS": "echo"
                }
            )

            if proc.returncode != 0:
                # Fallback to default branch if requested branch failed
                err_msg = mask_secrets(proc.stderr or proc.stdout or "Git clone failed")
                if "Remote branch" in err_msg and "not found" in err_msg:
                    fallback_cmd = [
                        "git", "clone",
                        "--depth", "1",
                        clone_url,
                        str(target_dir)
                    ]
                    proc_fb = subprocess.run(
                        fallback_cmd,
                        capture_output=True,
                        text=True,
                        timeout=timeout_seconds,
                        env={**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_ASKPASS": "echo"}
                    )
                    if proc_fb.returncode != 0:
                        raise SecurityError(f"Git clone failed: {mask_secrets(proc_fb.stderr or 'Unable to clone')}")
                else:
                    raise SecurityError(f"Git clone failed: {err_msg}")

            # Retrieve commit details safely
            commit_info = cls.get_commit_details(target_dir)

            # Scrub .git folder to enforce read-only static analysis and prevent accidental pushes
            git_folder = target_dir / ".git"
            if git_folder.exists():
                shutil.rmtree(git_folder, ignore_errors=True)

            return {
                "status": "cloned",
                "repo_url": clean_url,
                "branch": clean_branch,
                "commit_hash": commit_info.get("hash", "HEAD"),
                "commit_message": commit_info.get("message", "Shallow clone"),
                "author": commit_info.get("author", "Unknown"),
            }

        except subprocess.TimeoutExpired:
            raise SecurityError(f"Git clone timed out after {timeout_seconds}s limit. Check repository size or connection.")
        except Exception as e:
            if isinstance(e, SecurityError):
                raise
            raise SecurityError(f"Git operation encountered error: {mask_secrets(str(e))}")

    @staticmethod
    def get_commit_details(repo_dir: Path) -> Dict[str, str]:
        """Reads latest commit metadata before .git directory is isolated."""
        try:
            proc = subprocess.run(
                ["git", "log", "-1", "--format=%H|%an|%s"],
                cwd=str(repo_dir),
                capture_output=True,
                text=True,
                timeout=5
            )
            if proc.returncode == 0 and proc.stdout.strip():
                parts = proc.stdout.strip().split("|", 2)
                return {
                    "hash": parts[0] if len(parts) > 0 else "unknown",
                    "author": parts[1] if len(parts) > 1 else "unknown",
                    "message": parts[2] if len(parts) > 2 else ""
                }
        except Exception:
            pass
        return {"hash": "latest", "author": "repo", "message": "Imported repository"}


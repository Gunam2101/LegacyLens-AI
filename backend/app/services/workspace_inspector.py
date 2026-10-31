import os
from pathlib import Path
from typing import Dict, List, Any, Optional

from app.core.security import validate_safe_path, SecurityError
from app.schemas.schemas import FileNode, FileTreeResponse, FileContentResponse

LANGUAGE_EXTENSIONS = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".sql": "sql",
    ".html": "html",
    ".htm": "html",
    ".css": "css",
    ".scss": "css",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".txt": "text",
    ".java": "java",
    ".go": "go",
    ".rs": "rust",
    ".cs": "csharp",
    ".php": "php",
    ".sh": "shell",
    ".bat": "batch",
    ".xml": "xml"
}

IGNORED_NAMES = {
    ".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache",
    ".DS_Store", "Thumbs.db", ".idea", ".vscode"
}

class WorkspaceInspectorService:
    @classmethod
    def get_file_tree(cls, project_id: str, source_dir: Path, modernized_dir: Optional[Path] = None) -> FileTreeResponse:
        total_files = 0
        total_dirs = 0

        def build_node(current_path: Path, rel_dir: str = "") -> Optional[FileNode]:
            nonlocal total_files, total_dirs

            if current_path.name in IGNORED_NAMES:
                return None

            rel_str = current_path.relative_to(source_dir).as_posix() if current_path != source_dir else ""

            if current_path.is_dir():
                total_dirs += 1
                children: List[FileNode] = []
                try:
                    for child in sorted(current_path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
                        child_node = build_node(child, rel_str)
                        if child_node:
                            children.append(child_node)
                except PermissionError:
                    pass

                return FileNode(
                    name=current_path.name or "root",
                    path=rel_str,
                    is_dir=True,
                    size=0,
                    children=children
                )
            else:
                total_files += 1
                ext = current_path.suffix.lower()
                lang = LANGUAGE_EXTENSIONS.get(ext, "text")
                size = current_path.stat().st_size

                status = "unchanged"
                if modernized_dir and modernized_dir.exists():
                    mod_file = modernized_dir / rel_str
                    if mod_file.exists():
                        try:
                            if mod_file.read_bytes() != current_path.read_bytes():
                                status = "modified"
                        except Exception:
                            pass
                    else:
                        status = "removed"

                return FileNode(
                    name=current_path.name,
                    path=rel_str,
                    is_dir=False,
                    size=size,
                    language=lang,
                    status=status
                )

        root_node = build_node(source_dir) or FileNode(name="root", path="", is_dir=True, children=[])
        return FileTreeResponse(
            project_id=project_id,
            root=root_node,
            total_files=total_files,
            total_directories=total_dirs
        )

    @classmethod
    def get_file_content(cls, project_id: str, source_dir: Path, modernized_dir: Path, rel_path: str) -> FileContentResponse:
        safe_src = validate_safe_path(source_dir, rel_path)
        safe_mod = validate_safe_path(modernized_dir, rel_path) if modernized_dir.exists() else None

        orig_text = ""
        if safe_src.exists() and safe_src.is_file():
            orig_text = safe_src.read_text(encoding="utf-8", errors="replace")

        mod_text = orig_text
        if safe_mod and safe_mod.exists() and safe_mod.is_file():
            mod_text = safe_mod.read_text(encoding="utf-8", errors="replace")

        return FileContentResponse(
            project_id=project_id,
            file_path=rel_path,
            original_content=orig_text,
            modernized_content=mod_text,
            is_modified=(orig_text != mod_text)
        )


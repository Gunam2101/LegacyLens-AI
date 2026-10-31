import os
import shutil
import zipfile
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.core.config import settings
from app.core.security import validate_safe_path, validate_archive_stats, SecurityError

FORBIDDEN_EXTENSIONS = {".exe", ".dll", ".so", ".dylib", ".bin", ".vbs", ".cmd", ".bat"}

class ArchiveValidationResult:
    def __init__(self, is_valid: bool, file_count: int, total_size_bytes: int, files: List[str], error: str = ""):
        self.is_valid = is_valid
        self.file_count = file_count
        self.total_size_bytes = total_size_bytes
        self.files = files
        self.error = error

class ArchiveService:
    @staticmethod
    def inspect_and_validate_zip(zip_path: Path) -> ArchiveValidationResult:
        """Inspect ZIP archive headers for security validation before extraction."""
        if not zipfile.is_zipfile(zip_path):
            return ArchiveValidationResult(False, 0, 0, [], "File is not a valid ZIP archive")
        
        file_count = 0
        total_size = 0
        file_list: List[str] = []
        
        try:
            with zipfile.ZipFile(zip_path, 'r') as zf:
                infolist = zf.infolist()
                file_count = len(infolist)
                
                for info in infolist:
                    # Ignore directories
                    if info.is_dir():
                        continue
                    
                    total_size += info.file_size
                    norm_path = info.filename.replace("\\", "/")
                    file_list.append(norm_path)
                    
                    # Extension validation
                    ext = Path(norm_path).suffix.lower()
                    if ext in FORBIDDEN_EXTENSIONS:
                        return ArchiveValidationResult(
                            False, file_count, total_size, file_list,
                            f"Archive contains prohibited executable or binary file type: {norm_path}"
                        )
                
                # Check limits
                validate_archive_stats(
                    file_count,
                    total_size,
                    settings.MAX_FILE_COUNT,
                    settings.MAX_EXTRACTED_MB * 1024 * 1024
                )
                
            return ArchiveValidationResult(True, file_count, total_size, file_list)
        except SecurityError as se:
            return ArchiveValidationResult(False, file_count, total_size, file_list, str(se))
        except Exception as e:
            return ArchiveValidationResult(False, file_count, total_size, file_list, f"Archive inspection error: {str(e)}")

    @staticmethod
    def extract_safely(zip_path: Path, target_dir: Path) -> List[str]:
        """
        Safely extract ZIP contents with Zip-Slip protection.
        Returns list of extracted relative paths.
        """
        target_dir.mkdir(parents=True, exist_ok=True)
        extracted_files: List[str] = []
        
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for member in zf.infolist():
                if member.is_dir():
                    continue
                
                # Validate that member cannot escape target_dir
                safe_dest = validate_safe_path(target_dir, member.filename)
                
                # Ensure parent directory exists
                safe_dest.parent.mkdir(parents=True, exist_ok=True)
                
                # Write file safely
                with zf.open(member) as source, open(safe_dest, "wb") as target:
                    shutil.copyfileobj(source, target)
                    
                rel_path = safe_dest.relative_to(target_dir).as_posix()
                extracted_files.append(rel_path)
                
        return extracted_files

    @staticmethod
    def create_modernized_workspace(project_id: str) -> Tuple[Path, Path]:
        """
        Creates original source dir and a separate isolated modernized workspace dir.
        Never modifies the original uploaded files!
        """
        proj_root = settings.WORKSPACE_DIR / project_id
        source_dir = proj_root / "source"
        modernized_dir = proj_root / "modernized"
        
        source_dir.mkdir(parents=True, exist_ok=True)
        modernized_dir.mkdir(parents=True, exist_ok=True)
        
        return source_dir, modernized_dir

    @staticmethod
    def sync_to_modernized_workspace(source_dir: Path, modernized_dir: Path):
        """Duplicates source tree into modernized sandbox workspace for safe changes."""
        if source_dir.exists():
            for item in source_dir.iterdir():
                dest = modernized_dir / item.name
                if item.is_dir():
                    if dest.exists():
                        shutil.rmtree(dest)
                    shutil.copytree(item, dest)
                else:
                    shutil.copy2(item, dest)

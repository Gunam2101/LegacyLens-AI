import os
import re
from pathlib import Path
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

class DiscoveryReport(BaseModel):
    file_count: int
    total_loc: int
    languages: Dict[str, Dict[str, Any]] # { "Python": {"files": 12, "loc": 1400}, ... }
    primary_language: str
    frameworks: List[str]
    entrypoints: List[str]
    config_files: List[str]
    database_files: List[str]
    test_files: List[str]
    dependencies_manifests: List[str]
    structure_summary: Dict[str, Any]

LANGUAGE_EXTENSIONS = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".sql": "SQL",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "CSS",
    ".json": "JSON",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".java": "Java",
    ".go": "Go",
    ".cs": "C#",
    ".php": "PHP",
    ".kt": "Kotlin",
    ".rs": "Rust",
    ".sh": "Shell",
    ".bat": "Batch",
    ".md": "Markdown",
    ".xml": "XML"
}

FRAMEWORK_SIGNATURES = {
    "FastAPI": [r'from fastapi import', r'import fastapi'],
    "Flask": [r'from flask import', r'import flask', r'Flask\(__name__\)'],
    "Django": [r'django\.conf', r'django\.db', r'DJANGO_SETTINGS_MODULE'],
    "Express": [r'require\([\'"]express[\'"]\)', r'from [\'"]express[\'"]'],
    "React": [r'from [\'"]react[\'"]', r'require\([\'"]react[\'"]\)'],
    "Next.js": [r'next/router', r'next/navigation', r'next/link'],
    "Vue": [r'from [\'"]vue[\'"]', r'<template>'],
    "Spring Boot": [r'@SpringBootApplication', r'org\.springframework'],
    "ASP.NET": [r'Microsoft\.AspNetCore', r'using System\.Web'],
    "SQLAlchemy": [r'from sqlalchemy import', r'import sqlalchemy'],
    "Celery": [r'from celery import', r'Celery\('],
    "Pytest": [r'import pytest', r'def test_'],
    "Jest/Mocha": [r'describe\(', r'it\(', r'test\(']
}

ENTRYPOINT_PATTERNS = [
    r'^main\.py$', r'^app\.py$', r'^server\.py$', r'^manage\.py$', r'^wsgi\.py$',
    r'^index\.js$', r'^server\.js$', r'^app\.js$', r'^index\.ts$', r'^main\.ts$'
]

class ProjectDiscoveryService:
    @staticmethod
    def discover(workspace_path: Path) -> DiscoveryReport:
        file_count = 0
        total_loc = 0
        language_stats: Dict[str, Dict[str, int]] = {}
        framework_hits = set()
        entrypoints: List[str] = []
        config_files: List[str] = []
        database_files: List[str] = []
        test_files: List[str] = []
        manifests: List[str] = []
        directory_tree: Dict[str, int] = {}

        if not workspace_path.exists():
            return DiscoveryReport(
                file_count=0, total_loc=0, languages={}, primary_language="Unknown",
                frameworks=[], entrypoints=[], config_files=[], database_files=[],
                test_files=[], dependencies_manifests=[], structure_summary={}
            )

        for root, dirs, files in os.walk(workspace_path):
            # Ignore hidden, venv, node_modules dirs
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "venv", ".venv", "__pycache__", "dist", "build")]
            rel_dir = os.path.relpath(root, workspace_path).replace("\\", "/")
            if rel_dir != ".":
                top_folder = rel_dir.split("/")[0]
                directory_tree[top_folder] = directory_tree.get(top_folder, 0) + len(files)

            for file in files:
                file_count += 1
                file_path = Path(root) / file
                rel_file = os.path.relpath(file_path, workspace_path).replace("\\", "/")
                ext = file_path.suffix.lower()
                
                # Check manifests
                if file.lower() in ("requirements.txt", "package.json", "pyproject.toml", "pom.xml", "gemfile", "cargo.toml"):
                    manifests.append(rel_file)

                # Check config files
                if file.lower().startswith(".env") or file.lower().endswith((".config.js", ".config.ts", ".json", ".yaml", ".yml", ".ini", ".conf", ".cfg")):
                    config_files.append(rel_file)

                # Check DB files
                if ext in (".sql", ".ddl", ".dml") or "migration" in rel_file.lower():
                    database_files.append(rel_file)

                # Check test files
                if (file.startswith("test_") or file.endswith("_test.py") or ".test." in file or ".spec." in file or "tests/" in rel_file.lower()):
                    test_files.append(rel_file)

                # Check entrypoints
                for ep_pat in ENTRYPOINT_PATTERNS:
                    if re.match(ep_pat, file, re.IGNORECASE):
                        entrypoints.append(rel_file)

                # Read text files for LOC and framework signatures
                lang = LANGUAGE_EXTENSIONS.get(ext)
                if lang:
                    try:
                        content = file_path.read_text(encoding="utf-8", errors="ignore")
                        loc = len([l for l in content.splitlines() if l.strip()])
                        total_loc += loc
                        
                        if lang not in language_stats:
                            language_stats[lang] = {"files": 0, "loc": 0}
                        language_stats[lang]["files"] += 1
                        language_stats[lang]["loc"] += loc

                        # Check framework signatures
                        for fw, patterns in FRAMEWORK_SIGNATURES.items():
                            for pat in patterns:
                                if re.search(pat, content):
                                    framework_hits.add(fw)
                                    break
                    except Exception:
                        pass

        # Determine primary language
        primary_lang = "Generic"
        if language_stats:
            primary_lang = max(language_stats.items(), key=lambda x: x[1]["loc"])[0]

        return DiscoveryReport(
            file_count=file_count,
            total_loc=total_loc,
            languages=language_stats,
            primary_language=primary_lang,
            frameworks=sorted(list(framework_hits)),
            entrypoints=sorted(entrypoints),
            config_files=sorted(config_files)[:50],
            database_files=sorted(database_files),
            test_files=sorted(test_files),
            dependencies_manifests=sorted(manifests),
            structure_summary=directory_tree
        )

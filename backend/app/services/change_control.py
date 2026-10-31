import difflib
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.database import Project, CodeProposal, RuleAuditLog

class ChangeControlService:
    @classmethod
    def update_proposal_status(
        cls,
        db: Session,
        proposal_id: str,
        new_status: str,
        reason: str = ""
    ) -> Tuple[CodeProposal, List[str]]:
        """
        Updates proposal status and handles dependency awareness.
        If a proposal is rejected, flags dependent proposals.
        Returns (updated_proposal, list_of_warning_messages).
        """
        prop = db.query(CodeProposal).filter(CodeProposal.id == proposal_id).first()
        if not prop:
            raise ValueError(f"Proposal {proposal_id} not found")

        prev_status = prop.approval_status
        prop.approval_status = new_status
        warnings = []

        # Dependency check: if rejecting this proposal, check if other proposals depend on it
        if new_status == "rejected":
            dependent_proposals = db.query(CodeProposal).filter(
                CodeProposal.project_id == prop.project_id,
                CodeProposal.id != prop.id
            ).all()

            for dp in dependent_proposals:
                deps = dp.dependencies or []
                if prop.change_id in deps or prop.id in deps or prop.file_path == dp.file_path:
                    warnings.append(
                        f"Proposal {dp.change_id or dp.title} depends on or shares file with rejected change {prop.change_id}. Re-evaluation advised."
                    )
                    if dp.approval_status == "approved":
                        dp.approval_status = "under_review"

        db.commit()
        db.refresh(prop)
        return prop, warnings

    @classmethod
    def edit_proposal(
        cls,
        db: Session,
        proposal_id: str,
        new_title: Optional[str] = None,
        new_proposed_code: Optional[str] = None,
        new_rationale: Optional[str] = None
    ) -> CodeProposal:
        """
        Allows editing a proposal's proposed code, title, or rationale,
        recomputing the unified diff immediately.
        """
        prop = db.query(CodeProposal).filter(CodeProposal.id == proposal_id).first()
        if not prop:
            raise ValueError(f"Proposal {proposal_id} not found")

        if new_title:
            prop.title = new_title
        if new_rationale:
            prop.rationale = new_rationale
        if new_proposed_code is not None:
            prop.proposed_code = new_proposed_code
            # Recompute diff
            orig_lines = prop.original_code.splitlines(keepends=True)
            prop_lines = new_proposed_code.splitlines(keepends=True)
            diff = difflib.unified_diff(
                orig_lines,
                prop_lines,
                fromfile=f"a/{prop.file_path}",
                tofile=f"b/{prop.file_path}",
                n=3
            )
            prop.diff_content = "".join(diff)

        db.commit()
        db.refresh(prop)
        return prop

    @classmethod
    def apply_approved_changes(cls, db: Session, project_id: str) -> Dict[str, Any]:
        """
        Applies ONLY approved proposals into the isolated modernized workspace.
        Original source files in source workspace are preserved untouched!
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        source_dir = Path(project.workspace_path)
        modernized_dir = source_dir.parent / "modernized"
        modernized_dir.mkdir(parents=True, exist_ok=True)

        approved_proposals = db.query(CodeProposal).filter(
            CodeProposal.project_id == project_id,
            CodeProposal.approval_status == "approved"
        ).all()

        applied_count = 0
        failed_count = 0
        details = []

        for prop in approved_proposals:
            target_file = modernized_dir / prop.file_path
            try:
                target_file.parent.mkdir(parents=True, exist_ok=True)
                target_file.write_text(prop.proposed_code, encoding="utf-8")
                prop.applied_at = datetime.now(timezone.utc)
                prop.approval_status = "applied_in_workspace"
                applied_count += 1
                details.append({
                    "change_id": prop.change_id,
                    "file_path": prop.file_path,
                    "status": "applied"
                })
            except Exception as e:
                failed_count += 1
                details.append({
                    "change_id": prop.change_id,
                    "file_path": prop.file_path,
                    "status": f"failed: {str(e)}"
                })

        db.commit()
        return {
            "applied_count": applied_count,
            "failed_count": failed_count,
            "details": details
        }

    @classmethod
    def revert_proposal(cls, db: Session, proposal_id: str) -> CodeProposal:
        """
        Reverts a single proposal from the modernized workspace back to the source version.
        """
        prop = db.query(CodeProposal).filter(CodeProposal.id == proposal_id).first()
        if not prop:
            raise ValueError("Proposal not found")

        project = db.query(Project).filter(Project.id == prop.project_id).first()
        source_file = Path(project.workspace_path) / prop.file_path
        mod_file = (Path(project.workspace_path).parent / "modernized") / prop.file_path

        if source_file.exists() and mod_file.exists():
            mod_file.write_text(source_file.read_text(encoding="utf-8", errors="ignore"), encoding="utf-8")

        prop.approval_status = "reverted"
        prop.applied_at = None
        db.commit()
        db.refresh(prop)
        return prop

    @classmethod
    def rollback_all(cls, db: Session, project_id: str) -> Dict[str, Any]:
        """
        Full rollback: Restores modernized workspace to an exact replica of source workspace.
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError("Project not found")

        source_dir = Path(project.workspace_path)
        modernized_dir = source_dir.parent / "modernized"

        if modernized_dir.exists():
            shutil.rmtree(modernized_dir, ignore_errors=True)

        if source_dir.exists():
            shutil.copytree(source_dir, modernized_dir)

        # Reset applied proposals
        proposals = db.query(CodeProposal).filter(
            CodeProposal.project_id == project_id,
            CodeProposal.approval_status == "applied_in_workspace"
        ).all()
        for p in proposals:
            p.approval_status = "approved"
            p.applied_at = None

        db.commit()
        return {"status": "success", "message": "Modernized workspace cleanly rolled back to source state."}

    @classmethod
    def generate_unified_patch(cls, db: Session, project_id: str) -> str:
        """
        Generates a consolidated unified .patch of all approved and applied changes.
        Excluded rejected or pending changes.
        """
        proposals = db.query(CodeProposal).filter(
            CodeProposal.project_id == project_id,
            CodeProposal.approval_status.in_(["approved", "applied_in_workspace", "verified"])
        ).all()

        if not proposals:
            return "# No approved modernization changes found for this project."

        patch_lines = [
            f"# LegacyLens AI Modernization Patch",
            f"# Generated: {datetime.now(timezone.utc).isoformat()}",
            f"# Target Project ID: {project_id}",
            f"# Changes included: {len(proposals)}",
            "",
        ]

        for p in proposals:
            patch_lines.append(f"# ---------------------------------------------------------------------")
            patch_lines.append(f"# Change: {p.change_id or p.id} - {p.title}")
            patch_lines.append(f"# Rationale: {p.rationale}")
            patch_lines.append(f"# ---------------------------------------------------------------------")
            patch_lines.append(p.diff_content)
            patch_lines.append("")

        return "\n".join(patch_lines)


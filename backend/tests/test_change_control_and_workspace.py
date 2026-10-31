import pytest
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.database import SessionLocal, Project, CodeProposal
from app.services.change_control import ChangeControlService
from app.services.workspace_inspector import WorkspaceInspectorService
from app.services.verification_service import VerificationService

def test_change_control_workflow(tmp_path):
    db: Session = SessionLocal()
    try:
        # Create a test project
        proj = Project(
            name="Change Control Test App",
            workspace_path=str(tmp_path / "source")
        )
        db.add(proj)
        db.commit()

        source_dir = tmp_path / "source"
        source_dir.mkdir(parents=True)
        mod_dir = tmp_path / "modernized"
        mod_dir.mkdir(parents=True)

        test_file = source_dir / "calc.py"
        test_file.write_text("def add(a, b):\n    return a + b\n")

        # Create proposal 1
        p1 = CodeProposal(
            project_id=proj.id,
            change_id="CHG-001",
            title="Add Type Hints",
            file_path="calc.py",
            original_code="def add(a, b):\n    return a + b\n",
            proposed_code="def add(a: int, b: int) -> int:\n    return a + b\n",
            diff_content="--- a/calc.py\n+++ b/calc.py\n@@ -1,2 +1,2 @@\n-def add(a, b):\n+def add(a: int, b: int) -> int:\n",
            approval_status="proposed"
        )
        # Create proposal 2 depending on CHG-001
        p2 = CodeProposal(
            project_id=proj.id,
            change_id="CHG-002",
            title="Add Range Check",
            file_path="calc.py",
            original_code="def add(a: int, b: int) -> int:\n    return a + b\n",
            proposed_code="def add(a: int, b: int) -> int:\n    assert a > 0\n    return a + b\n",
            diff_content="+    assert a > 0\n",
            dependencies=["CHG-001"],
            approval_status="approved"
        )
        db.add_all([p1, p2])
        db.commit()

        # 1. Edit proposal p1
        edited = ChangeControlService.edit_proposal(
            db, p1.id, new_title="Add Explicit Type Hints",
            new_proposed_code="def add(a: float, b: float) -> float:\n    return a + b\n"
        )
        assert edited.title == "Add Explicit Type Hints"
        assert "float" in edited.diff_content

        # 2. Reject proposal p1 and verify p2 is flagged/warned
        updated_p1, warnings = ChangeControlService.update_proposal_status(
            db, p1.id, "rejected", "Rejected by architect"
        )
        assert updated_p1.approval_status == "rejected"
        assert any("CHG-001" in w for w in warnings)
        
        # Reload p2
        db.refresh(p2)
        assert p2.approval_status == "under_review"

        # 3. Approve p1 and apply approved changes
        p1.approval_status = "approved"
        db.commit()
        apply_res = ChangeControlService.apply_approved_changes(db, proj.id)
        assert apply_res["applied_count"] >= 1

        # Check modernized file was written while source file remained untouched
        mod_file = mod_dir / "calc.py"
        assert mod_file.exists()
        assert "float" in mod_file.read_text()
        assert "def add(a, b):" in test_file.read_text() # Source unchanged!

        # 4. Generate unified patch
        patch = ChangeControlService.generate_unified_patch(db, proj.id)
        assert "LegacyLens AI Modernization Patch" in patch

        # 5. Rollback
        rb_res = ChangeControlService.rollback_all(db, proj.id)
        assert rb_res["status"] == "success"

        # Cleanup
        db.delete(p1)
        db.delete(p2)
        db.delete(proj)
        db.commit()
    finally:
        db.close()

def test_workspace_inspector(tmp_path):
    src = tmp_path / "src"
    src.mkdir()
    (src / "app.py").write_text("print('hello')\n")
    sub = src / "components"
    sub.mkdir()
    (sub / "Button.tsx").write_text("export const Button = () => <button>Click</button>;\n")

    tree = WorkspaceInspectorService.get_file_tree("test_proj", src, None)
    assert tree.total_files == 2
    assert tree.total_directories >= 1

    content = WorkspaceInspectorService.get_file_content("test_proj", src, src, "app.py")
    assert "print('hello')" in content.original_content
    assert not content.is_modified

def test_visual_dom_regression_comparison():
    orig_html = """
    <html>
      <head><title>Old Portal</title></head>
      <body>
        <table style="width:100%">
          <tr><td style="color:red">Notice</td></tr>
        </table>
        <button>Submit</button>
      </body>
    </html>
    """

    modern_html = """
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Old Portal — Modernized</title>
      </head>
      <body class="bg-slate-50 text-slate-900">
        <div class="max-w-4xl mx-auto p-4 rounded-xl shadow-sm bg-white">
          <span class="text-rose-600 font-semibold">Notice</span>
        </div>
        <button class="px-4 py-2 bg-indigo-600 text-white rounded-lg">Submit</button>
      </body>
    </html>
    """

    res = VerificationService.compare_visual_dom(orig_html, modern_html)
    assert res["visual_diff_status"] == "enhanced"
    assert res["inline_styles_eliminated"] >= 2
    assert res["responsive_viewport_preserved"] is True
    assert res["viewport_added"] is True
    assert res["accessibility_compliance"] == "WCAG 2.1 AA"


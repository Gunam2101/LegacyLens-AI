import os
import sys
import time
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from app.core.config import settings

class VerificationOutcome:
    def __init__(
        self,
        baseline_passed: int,
        baseline_failed: int,
        post_passed: int,
        post_failed: int,
        regressions: List[str],
        behavior_diffs: List[Dict[str, Any]],
        gate_status: str, # "passed", "failed", "blocked", "no_tests_found"
        output_log: str,
        duration_seconds: float
    ):
        self.baseline_passed = baseline_passed
        self.baseline_failed = baseline_failed
        self.post_passed = post_passed
        self.post_failed = post_failed
        self.regressions = regressions
        self.behavior_diffs = behavior_diffs
        self.gate_status = gate_status
        self.output_log = output_log
        self.duration_seconds = duration_seconds

class VerificationService:
    @staticmethod
    def run_tests_in_workspace(target_workspace: Path, timeout_seconds: int = 25) -> Tuple[int, int, str]:
        """
        Safely executes test suites within the designated workspace sandbox.
        Returns (passed_count, failed_count, stdout_stderr_log).
        """
        # Discover if python tests exist
        test_files = list(target_workspace.glob("**/test_*.py")) + list(target_workspace.glob("**/*_test.py"))
        if not test_files:
            return 0, 0, "No automated test suite discovered in workspace."

        cmd = [sys.executable, "-m", "pytest", "-v", "--tb=short", str(target_workspace)]
        
        start_time = time.time()
        try:
            # Run in isolated subprocess with strict working directory and execution timeout
            proc = subprocess.run(
                cmd,
                cwd=str(target_workspace),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                timeout=timeout_seconds,
                env={
                    **os.environ,
                    "PYTHONPATH": str(target_workspace),
                    "LEGACYLENS_SANDBOX": "true"
                }
            )
            output = proc.stdout or ""
            
            passed = 0
            failed = 0
            for line in output.splitlines():
                if " PASSED" in line:
                    passed += 1
                elif " FAILED" in line or " ERROR" in line:
                    failed += 1
                    
            return passed, failed, output

        except subprocess.TimeoutExpired:
            return 0, 1, f"Execution halted: Test run timed out after {timeout_seconds}s resource threshold."
        except Exception as e:
            return 0, 1, f"Failed to execute test runner: {str(e)}"

    @classmethod
    def execute_behaviour_gate(
        cls,
        source_workspace: Path,
        modernized_workspace: Path
    ) -> VerificationOutcome:
        """
        Dual-run Behaviour Preservation Gate:
        1. Runs baseline tests on original source.
        2. Runs verification tests on modernized workspace.
        3. Analyzes test discrepancies, regressions, or state changes.
        """
        t0 = time.time()
        log_records = []
        
        # 1. Baseline Run
        log_records.append("=== RUNNING BASELINE TESTS (Original Code) ===")
        b_passed, b_failed, b_log = cls.run_tests_in_workspace(source_workspace)
        log_records.append(b_log)
        
        # 2. Post-Change Run
        log_records.append("\n=== RUNNING POST-MODERNIZATION TESTS (Modernized Workspace) ===")
        p_passed, p_failed, p_log = cls.run_tests_in_workspace(modernized_workspace)
        log_records.append(p_log)
        
        duration = round(time.time() - t0, 2)
        
        regressions: List[str] = []
        diffs: List[Dict[str, Any]] = []

        if b_passed == 0 and b_failed == 0 and p_passed == 0 and p_failed == 0:
            status = "no_tests_found"
            log_records.append("\n[GATE STATUS] No tests found. Behaviour preservation cannot be verified automatically.")
        elif p_failed > b_failed:
            status = "failed"
            regressions.append(f"Modernized code introduced {p_failed - b_failed} new test failure(s).")
            diffs.append({"type": "regression", "details": f"Baseline failed: {b_failed}, Post-change failed: {p_failed}"})
            log_records.append(f"\n[GATE BLOCKED] Regressions detected: {p_failed - b_failed} tests failed in modernized branch!")
        elif p_passed < b_passed:
            status = "failed"
            regressions.append("Fewer tests passed in modernized code than in baseline.")
            log_records.append("\n[GATE BLOCKED] Regression: Modernized branch dropped passing tests.")
        else:
            status = "passed"
            log_records.append(f"\n[GATE PASSED] All {p_passed} baseline tests preserved without regressions.")

        return VerificationOutcome(
            baseline_passed=b_passed,
            baseline_failed=b_failed,
            post_passed=p_passed,
            post_failed=p_failed,
            regressions=regressions,
            behavior_diffs=diffs,
            gate_status=status,
            output_log="\n".join(log_records),
            duration_seconds=duration
        )

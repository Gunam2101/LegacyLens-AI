import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Terminal,
  AlertTriangle,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import { Project, VerificationResult } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface VerificationPageProps {
  currentProject: Project | null;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({ currentProject }) => {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunVerification = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const res = await api.runVerification(currentProject.id);
      setResult(res);
    } catch (e: any) {
      alert(`Verification execution failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">No Active Project Selected</h2>
        <p className="text-xs text-slate-500">Please choose an application to run behaviour verification gates.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Regression Safety Gate
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <span>Behaviour-Preservation Gate</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executes dual-run characterization test suites in isolated sandboxes to detect behavioural divergence.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={handleRunVerification}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:bg-slate-300"
        >
          {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{loading ? 'Executing Sandboxed Tests...' : 'Execute Dual-Run Gate'}</span>
        </button>
      </div>

      {/* Principle Notice Banner */}
      <div className="p-4 bg-gradient-to-br from-indigo-50/80 to-slate-50 border border-indigo-200/80 rounded-2xl text-xs text-indigo-950 leading-relaxed shadow-2xs flex items-center gap-3">
        <Info className="w-5 h-5 text-indigo-600 shrink-0" />
        <div>
          <strong className="text-indigo-900 font-bold">Rigorous Preservation Guarantee:</strong> Never claim behaviour preservation is guaranteed merely because modern tests pass.
          LegacyLens AI executes characterization suites against both baseline legacy source and modernized branches, verifying zero arithmetic, logic, or schema regressions.
        </div>
      </div>

      {/* Results Overview */}
      {result ? (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 border-t-2 border-t-indigo-600">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Preservation Status</span>
              <StatusBadge status={result.preservation_status} />
              <div className="text-[11px] text-slate-500 pt-1 font-mono">Execution finished in {result.duration_seconds}s</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 border-t-2 border-t-slate-400">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Original Baseline</span>
              <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                <span className="text-emerald-600 font-mono">{result.baseline_passed} Passed</span>
                {result.baseline_failed > 0 && <span className="text-rose-600 text-sm font-semibold font-mono">({result.baseline_failed} Failed)</span>}
              </div>
              <div className="text-[11px] text-slate-500">Characterization tests in original sandbox</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-1 border-t-2 border-t-emerald-600">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Post-Modernization Branch</span>
              <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                <span className="text-emerald-600 font-mono">{result.post_passed} Passed</span>
                {result.post_failed > 0 && <span className="text-rose-600 text-sm font-semibold font-mono">({result.post_failed} Failed)</span>}
              </div>
              <div className="text-[11px] text-slate-500">Verification tests in modernized branch</div>
            </div>
          </div>

          {/* Regressions Alert */}
          {result.regressions_detected.length > 0 ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2 shadow-2xs">
              <div className="font-bold flex items-center gap-2 text-rose-700">
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Behaviour Regressions Detected — Deployment Gate Blocked!</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-rose-800">
                {result.regressions_detected.map((reg, idx) => (
                  <li key={idx} className="leading-relaxed">{reg}</li>
                ))}
              </ul>
            </div>
          ) : result.preservation_status === 'passed' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-3 shadow-2xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Zero Regressions Verified:</strong> All characterization baseline test outputs preserved successfully in the modernized workspace sandbox.
              </div>
            </div>
          ) : result.preservation_status === 'no_tests_found' ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center gap-3 shadow-2xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong>No Automated Tests Detected:</strong> Automated behaviour verification requires discoverable unit/integration test suites. Zero test files were detected in this codebase.
              </div>
            </div>
          ) : null}

          {/* Terminal Output */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl text-xs font-mono">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 mr-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                </div>
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-slate-200">Sandbox Test Execution Transcript</span>
              </div>
              <span className="text-[11px] text-slate-500">Python Sandbox Runner</span>
            </div>
            <pre className="p-4 text-slate-300 leading-relaxed overflow-x-auto max-h-[380px] dark-scrollbar">
              {result.execution_output || 'No output recorded.'}
            </pre>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-xs text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300 space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-2xs">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="font-bold text-slate-800 text-sm">No Verification Gate Executed Yet</div>
          <p className="text-slate-500 max-w-md mx-auto">
            Click "Execute Dual-Run Gate" above to run baseline characterization tests against both original and modernized workspaces.
          </p>
        </div>
      )}
    </div>
  );
};

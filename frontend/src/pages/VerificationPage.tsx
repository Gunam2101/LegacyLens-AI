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
  Clock
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
    return <div className="p-8 text-center text-xs text-slate-500">Select a project to run verification.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            Behaviour-Preservation Gate
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Executes dual-run baseline characterization suites in sandboxed isolated environments to detect behavioural divergence.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={handleRunVerification}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
        >
          {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{loading ? 'Executing Sandboxed Tests...' : 'Run Behaviour Gate'}</span>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl text-xs text-indigo-900 leading-relaxed flex items-center justify-between">
        <div>
          <strong>Core Product Principle:</strong> Never claim behaviour preservation is guaranteed merely because tests pass.
          LegacyLens AI compares baseline execution outputs against modernized branches and flags unexpected arithmetic, state, or filter discrepancies.
        </div>
      </div>

      {/* Results Overview */}
      {result ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Preservation Status</span>
              <StatusBadge status={result.preservation_status} />
              <div className="text-[11px] text-slate-500 pt-1">Execution completed in {result.duration_seconds}s</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Original Baseline</span>
              <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <span className="text-emerald-600">{result.baseline_passed} Passed</span>
                {result.baseline_failed > 0 && <span className="text-rose-600 text-sm font-semibold">({result.baseline_failed} Failed)</span>}
              </div>
              <div className="text-[11px] text-slate-500">Characterization tests in original workspace</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Post-Modernization</span>
              <div className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <span className="text-emerald-600">{result.post_passed} Passed</span>
                {result.post_failed > 0 && <span className="text-rose-600 text-sm font-semibold">({result.post_failed} Failed)</span>}
              </div>
              <div className="text-[11px] text-slate-500">Verification tests in modernized branch</div>
            </div>
          </div>

          {/* Regressions Alert */}
          {result.regressions_detected.length > 0 ? (
            <div className="p-5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 space-y-2">
              <div className="font-bold flex items-center gap-2 text-rose-700">
                <XCircle className="w-5 h-5 text-rose-600" />
                <span>Behaviour Regressions Detected — Deployment Gate Blocked!</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-rose-800">
                {result.regressions_detected.map((reg, idx) => (
                  <li key={idx}>{reg}</li>
                ))}
              </ul>
            </div>
          ) : result.preservation_status === 'passed' ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <strong>Zero Regressions:</strong> All baseline tests preserved successfully in the modernized workspace sandbox.
              </div>
            </div>
          ) : null}

          {/* Terminal Output */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-xl text-xs font-mono">
            <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                <span>Sandbox Test Execution Transcript</span>
              </div>
              <span className="text-[11px] text-slate-500">Python Isolated Runner</span>
            </div>
            <pre className="p-4 text-slate-300 leading-relaxed overflow-x-auto max-h-[350px]">
              {result.execution_output || 'No output recorded.'}
            </pre>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <ShieldAlert className="w-10 h-10 text-slate-400 mx-auto opacity-40" />
          <div className="font-semibold text-slate-700">No Verification Run Yet</div>
          <p className="text-slate-500 max-w-md mx-auto">
            Click "Run Behaviour Gate" above to execute tests against both the original source and the modernized workspace.
          </p>
        </div>
      )}
    </div>
  );
};

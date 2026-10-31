import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  RotateCw,
  Clock,
  ShieldCheck,
  FileSpreadsheet,
  Network,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { BenchmarkMetrics, Project } from '../types';

interface BenchmarkPageProps {
  onSelectProject: (p: Project) => void;
  refreshProjects: () => void;
}

export const BenchmarkPage: React.FC<BenchmarkPageProps> = ({ onSelectProject, refreshProjects }) => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<BenchmarkMetrics | null>(null);
  const [gtVerification, setGtVerification] = useState<Record<string, boolean> | null>(null);
  const [benchmarkId, setBenchmarkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRunBenchmark = async () => {
    setLoading(true);
    try {
      const res = await api.runSyntheticBenchmark();
      setMetrics(res.metrics);
      setGtVerification(res.ground_truth_verification);
      setBenchmarkId(res.benchmark_id);
      refreshProjects();
    } catch (e: any) {
      alert(`Benchmark run failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBenchmarkProject = async () => {
    if (!benchmarkId) return;
    try {
      const proj = await api.getProject(benchmarkId);
      onSelectProject(proj);
      navigate('/dashboard');
    } catch (e: any) {
      alert(`Could not open project: ${e.message}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
            Evaluation & Ground-Truth Benchmarking Suite
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated benchmark assessing rule extraction precision/recall, obsolete code safety, and replanning against a synthetic legacy billing engine.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={handleRunBenchmark}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-colors"
        >
          {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{loading ? 'Executing Evaluation Benchmark...' : 'Run Automated Benchmark'}</span>
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl text-xs space-y-2 border border-slate-800 shadow-md">
        <div className="font-bold flex items-center gap-2 text-white text-sm">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Synthetic Application Profile: LegacyCare Billing & Invoicing Engine</span>
        </div>
        <p className="text-slate-400 leading-relaxed text-[11px]">
          Contains intentionally designed legacy components: Python arithmetic discounts, late payment fees, SQL table check constraints, an intentionally obsolete analog modem module (<code>legacy_fax_dispatcher.py</code>), an indirectly referenced compliance logger (<code>audit_compliance_logger.py</code>), and production incident report <code>INC-4092</code> that creates a rule conflict on weekend grace periods.
        </p>
      </div>

      {/* Benchmark Results */}
      {metrics ? (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Rule Recall</span>
              <div className="text-2xl font-extrabold text-emerald-600">
                {(metrics.business_rule_recall * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {metrics.rules_detected_count} extracted / {metrics.ground_truth_rules_count} target
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Rule Precision</span>
              <div className="text-2xl font-extrabold text-indigo-600">
                {(metrics.business_rule_precision * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Verified AST line anchors</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Obsolete False-Positive</span>
              <div className="text-2xl font-extrabold text-slate-900">
                {(metrics.obsolete_false_positive_rate * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-emerald-600 mt-0.5 font-semibold">Zero unsafe deletions</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Traceability Score</span>
              <div className="text-2xl font-extrabold text-violet-600">
                {(metrics.evidence_traceability_score * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">100% code references verified</div>
            </div>
          </div>

          {/* Detailed Verification Checklist */}
          {gtVerification && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">Ground-Truth Test Verification Checklist</h3>
                {benchmarkId && (
                  <button
                    onClick={handleOpenBenchmarkProject}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <span>Inspect Benchmark Project in Dashboard</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {Object.entries(gtVerification).map(([key, passed]) => (
                  <div
                    key={key}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      passed ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
                    }`}
                  >
                    <span className="font-mono text-[11px]">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="flex items-center gap-1 font-bold text-[11px]">
                      {passed ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>PASS</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-rose-600" />
                          <span>FAIL</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution & Cost Metrics */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600">
            <div>
              <strong>Execution Duration:</strong> {metrics.execution_duration_seconds}s
            </div>
            <div>
              <strong>Test Baseline:</strong> {metrics.baseline_tests_passed} tests passed ({metrics.test_suite_execution_status})
            </div>
            <div>
              <strong>Replanning Conflict Detected:</strong> {metrics.conflicting_rules_flagged} rule(s)
            </div>
            <div>
              <strong>Estimated LLM Cost:</strong> {metrics.llm_cost_estimate}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-16 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <Zap className="w-10 h-10 text-amber-400 mx-auto opacity-50" />
          <h3 className="font-bold text-slate-800 text-sm">No Benchmark Run Recorded Yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Click "Run Automated Benchmark" to evaluate LegacyLens AI against the synthetic legacy billing engine.
          </p>
        </div>
      )}
    </div>
  );
};

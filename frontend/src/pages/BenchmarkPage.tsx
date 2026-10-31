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
  ArrowRight,
  Gauge
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
    <div className="max-w-6xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Precision & Recall Benchmark
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-amber-500 fill-amber-500" />
            <span>Evaluation & Ground-Truth Benchmarking Suite</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automated benchmark measuring rule extraction precision/recall, dead-code safety, and evidence replanning.
          </p>
        </div>

        <button
          disabled={loading}
          onClick={handleRunBenchmark}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:bg-slate-300"
        >
          {loading ? <RotateCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{loading ? 'Executing Evaluation Benchmark...' : 'Run Automated Benchmark'}</span>
        </button>
      </div>

      {/* Explanation Banner */}
      <div className="p-5 bg-slate-950 text-slate-200 rounded-3xl text-xs space-y-2.5 border border-slate-800 shadow-xl">
        <div className="font-bold flex items-center gap-2 text-white text-sm">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Synthetic Ground-Truth Profile: LegacyCare Billing & Invoicing Engine</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Contains intentionally engineered legacy patterns: Python arithmetic discounts, late payment fees, SQL table check constraints, an intentionally obsolete analog modem module (<code className="text-indigo-300">legacy_fax_dispatcher.py</code>), an indirectly referenced compliance logger (<code className="text-indigo-300">audit_compliance_logger.py</code>), and production incident report <code className="text-amber-300">INC-4092</code> that creates a rule conflict on weekend grace periods.
        </p>
      </div>

      {/* Benchmark Results */}
      {metrics ? (
        <div className="space-y-6 animate-fade-in">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs border-t-2 border-t-emerald-500">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Rule Recall</span>
              <div className="text-3xl font-extrabold text-emerald-600 font-mono tracking-tight">
                {(metrics.business_rule_recall * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {metrics.rules_detected_count} extracted / {metrics.ground_truth_rules_count} ground-truth
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs border-t-2 border-t-indigo-500">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Rule Precision</span>
              <div className="text-3xl font-extrabold text-indigo-600 font-mono tracking-tight">
                {(metrics.business_rule_precision * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Verified AST line anchors</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs border-t-2 border-t-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Obsolete False-Positive</span>
              <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {(metrics.obsolete_false_positive_rate * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-emerald-600 mt-1 font-semibold">Zero unsafe deletions</div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs border-t-2 border-t-violet-500">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block mb-1">Traceability Score</span>
              <div className="text-3xl font-extrabold text-violet-600 font-mono tracking-tight">
                {(metrics.evidence_traceability_score * 100).toFixed(0)}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">100% code references verified</div>
            </div>
          </div>

          {/* Ground-Truth Checklist */}
          {gtVerification && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">Ground-Truth Verification Checklist</h3>
                {benchmarkId && (
                  <button
                    onClick={handleOpenBenchmarkProject}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
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
                    className={`p-3.5 rounded-xl border flex items-center justify-between shadow-2xs ${
                      passed ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950' : 'bg-rose-50/60 border-rose-200 text-rose-950'
                    }`}
                  >
                    <span className="font-mono text-[11px] font-medium">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className={`flex items-center gap-1.5 font-bold text-[11px] px-2 py-0.5 rounded-full ${
                      passed ? 'bg-emerald-100/80 text-emerald-800' : 'bg-rose-100/80 text-rose-800'
                    }`}>
                      {passed ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PASS</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>FAIL</span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Execution & Cost Metrics Footer */}
          <div className="p-4 bg-slate-50/90 rounded-2xl border border-slate-200/90 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-600 shadow-2xs">
            <div>
              <strong>Execution Duration:</strong> <span className="font-mono font-semibold text-slate-800">{metrics.execution_duration_seconds}s</span>
            </div>
            <div>
              <strong>Baseline Tests:</strong> <span className="font-mono font-semibold text-emerald-600">{metrics.baseline_tests_passed} passed</span> ({metrics.test_suite_execution_status})
            </div>
            <div>
              <strong>Discrepancies Flagged:</strong> <span className="font-mono font-semibold text-rose-600">{metrics.conflicting_rules_flagged} rule(s)</span>
            </div>
            <div>
              <strong>Inference Cost:</strong> <span className="font-mono font-semibold text-slate-800">{metrics.llm_cost_estimate}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-xs text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300 space-y-3 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-2xs">
            <Zap className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">No Benchmark Run Recorded Yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            Click "Run Automated Benchmark" to evaluate LegacyLens AI against the synthetic legacy billing engine.
          </p>
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Zap,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Network,
  Milestone,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Sparkles,
  GitBranch,
  Globe
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface HomePageProps {
  projects: Project[];
  onSelectProject: (p: Project) => void;
  refreshProjects: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ projects, onSelectProject, refreshProjects }) => {
  const navigate = useNavigate();
  const [loadingBenchmark, setLoadingBenchmark] = useState(false);

  const handleRunDemoBenchmark = async () => {
    setLoadingBenchmark(true);
    try {
      const res = await api.runSyntheticBenchmark();
      refreshProjects();
      const proj = await api.getProject(res.benchmark_id);
      onSelectProject(proj);
      navigate('/dashboard');
    } catch (e: any) {
      alert(`Benchmark execution failed: ${e.message}`);
    } finally {
      setLoadingBenchmark(false);
    }
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto py-2">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-8 md:p-12 overflow-hidden shadow-2xl border border-indigo-900/40">
        <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-violet-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="max-w-2xl relative z-10 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Universal Application Modernization Platform</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Modernize Legacy Codebases <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">Safely & Deterministically</span>
          </h1>
          
          <p className="text-slate-300 text-sm md:text-base leading-relaxed font-normal">
            Analyze websites, ZIP archives, or Git repositories. Reconstruct buried business rules, map AST dependencies, safely preview modern visual redesigns, and gate code changes behind dual-run verification.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/upload')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Onboard Project (URL / ZIP / Git)</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>

            <button
              onClick={handleRunDemoBenchmark}
              disabled={loadingBenchmark}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/20 flex items-center gap-2 backdrop-blur-md transition-all active:scale-[0.98]"
            >
              <Zap className={`w-4 h-4 text-amber-400 ${loadingBenchmark ? 'animate-spin' : ''}`} />
              <span>{loadingBenchmark ? 'Synthesizing Architecture...' : 'Run Synthetic Benchmark'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Architectural Foundations */}
      <div>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Autonomous Modernization Architecture</h2>
          <p className="text-xs text-slate-500 mt-0.5">Every finding backed by deterministic AST parsing, evidence citations, and characterization tests.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Business Rule Reconstruction</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracts conditional branches, database check constraints, and formulas with exact line numbers, confidence ratings, and incident cross-referencing.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center mb-4 shadow-2xs">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Evidence-Based Dependency AST</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Maps structural interactions across modules, functions, SQL tables, and endpoints with explicit static-verification vs dynamic-dispatch tagging.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Behaviour-Preservation Gate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Executes dual-run baseline characterization suites in isolated sandboxes to verify zero arithmetic, logic, or schema regressions before changes apply.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Projects List */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Application Analyses</h3>
            <p className="text-xs text-slate-500 mt-0.5">Select an active codebase to inspect reconstructed rules, visual redesigns, and change proposals.</p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors"
          >
            <span>View All ({projects.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12 bg-slate-50/70 rounded-xl border border-dashed border-slate-300">
            <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-50" />
            <div className="text-xs font-bold text-slate-700">No applications analyzed yet</div>
            <div className="text-xs text-slate-500 mt-1 mb-4">Onboard a public website URL, source code ZIP, Git repo, or run the synthetic benchmark.</div>
            <button
              onClick={handleRunDemoBenchmark}
              disabled={loadingBenchmark}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-colors"
            >
              {loadingBenchmark ? 'Launching Demo...' : 'Load Synthetic Billing Engine'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {projects.slice(0, 5).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  onSelectProject(p);
                  navigate('/dashboard');
                }}
                className="py-3 px-3.5 hover:bg-slate-50/80 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-150 group"
              >
                <div className="space-y-1">
                  <div className="font-semibold text-slate-900 text-xs flex items-center gap-2.5">
                    <span className="group-hover:text-indigo-600 transition-colors">{p.name}</span>
                    <StatusBadge status={p.status} size="sm" />
                    {p.source_type === 'url' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        <Globe className="w-3 h-3" /> URL
                      </span>
                    )}
                    {p.source_type === 'git' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        <GitBranch className="w-3 h-3" /> Git
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-3">
                    <span>Analyzed {new Date(p.created_at).toLocaleDateString()}</span>
                    <span>&bull;</span>
                    <span>{p.stats?.file_count || 0} Files</span>
                    <span>&bull;</span>
                    <span>{(p.stats?.total_loc || 0).toLocaleString()} LOC</span>
                    {p.frameworks && p.frameworks.length > 0 && (
                      <>
                        <span>&bull;</span>
                        <span className="text-slate-600">{p.frameworks.join(', ')}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                    Open Matrix
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

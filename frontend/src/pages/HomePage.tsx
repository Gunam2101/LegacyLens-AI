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
  FolderOpen
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';

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
    <div className="space-y-10 max-w-6xl mx-auto py-4">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-brand-950 via-slate-900 to-indigo-950 text-white p-10 md:p-14 overflow-hidden shadow-xl border border-indigo-900/30">
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="max-w-2xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Domain-Independent &bull; Evidence-Driven
          </div>
          
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Modernize Legacy Applications <span className="text-indigo-400">Without Losing</span> What Matters
          </h1>
          
          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            Upload your source code. Let AI investigate its architecture, reconstruct hidden business rules, identify risks, and rigorously verify modernization changes before applying them.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <button
              onClick={() => navigate('/upload')}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Application (ZIP)</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>

            <button
              onClick={handleRunDemoBenchmark}
              disabled={loadingBenchmark}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-sm border border-white/20 flex items-center gap-2 backdrop-blur-md transition-all"
            >
              <Zap className={`w-4 h-4 text-amber-400 ${loadingBenchmark ? 'animate-spin' : ''}`} />
              <span>{loadingBenchmark ? 'Running Synthetic App...' : 'Try Sample Billing App'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Core Principles Grid */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Autonomous Modernization Architecture</h2>
          <p className="text-xs text-slate-500">Every decision backed by traceable code evidence, test baselines, and human approval gates.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Business Rule Reconstruction</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Extracts conditional statements, SQL check constraints, calculations, and formulas with exact line numbers and confidence ratings.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Network className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Evidence-Based Dependencies</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Maps interactions across modules, functions, SQL tables, and endpoints. Clearly isolates statically verified links from dynamic dispatch.
            </p>
          </div>

          <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Behaviour-Preservation Gate</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Runs baseline tests in an isolated sandbox. Compares post-modernization test runs against baseline outputs to halt regressions.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Analysis Projects</h3>
            <p className="text-xs text-slate-500">Select an existing codebase to inspect reconstructed rules and roadmaps.</p>
          </div>
          <button
            onClick={() => navigate('/projects')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
            <div className="text-xs font-semibold text-slate-700">No projects analyzed yet</div>
            <div className="text-xs text-slate-500 mt-1 mb-4">Upload a legacy ZIP archive or run the synthetic demo benchmark.</div>
            <button
              onClick={handleRunDemoBenchmark}
              disabled={loadingBenchmark}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-xs shadow-xs"
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
                className="py-3 px-3 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                    {p.name}
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {p.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                    <span>Analyzed {new Date(p.created_at).toLocaleDateString()}</span>
                    <span>&bull;</span>
                    <span>{p.stats?.file_count || 0} Files</span>
                    <span>&bull;</span>
                    <span>{p.stats?.total_loc || 0} LOC</span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

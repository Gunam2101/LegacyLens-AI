import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileCode,
  FileSpreadsheet,
  Network,
  Milestone,
  ShieldAlert,
  ArrowRight,
  Database,
  Cpu,
  Layers,
  CheckCircle,
  AlertTriangle,
  Globe,
  GitBranch,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Project, BusinessRule, CoreFeature, DependencyGraph, ObsoleteFinding } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { TokenUsageIndicator } from '../components/TokenUsageIndicator';

interface DashboardPageProps {
  currentProject: Project | null;
}

const COLORS = ['#6366f1', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export const DashboardPage: React.FC<DashboardPageProps> = ({ currentProject }) => {
  const navigate = useNavigate();
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [features, setFeatures] = useState<CoreFeature[]>([]);
  const [deps, setDeps] = useState<DependencyGraph | null>(null);
  const [obsolete, setObsolete] = useState<ObsoleteFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    Promise.all([
      api.getBusinessRules(currentProject.id).catch(() => []),
      api.getCoreFeatures(currentProject.id).catch(() => []),
      api.getDependencies(currentProject.id).catch(() => null),
      api.getObsoleteFindings(currentProject.id).catch(() => [])
    ]).then(([r, f, d, o]) => {
      setRules(r);
      setFeatures(f);
      setDeps(d);
      setObsolete(o);
      setLoading(false);
    });
  }, [currentProject?.id]);

  if (!currentProject) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <LayoutDashboard className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">No Active Project Selected</h2>
        <p className="text-xs text-slate-500">Please choose an analyzed codebase from the projects catalogue or onboard a new application.</p>
        <button
          onClick={() => navigate('/projects')}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
        >
          View Projects Catalogue
        </button>
      </div>
    );
  }

  const langData = Object.entries(currentProject.languages || {}).map(([name, value]) => ({
    name,
    value
  }));

  const conflictingRulesCount = rules.filter(r => r.status === 'conflicting').length;
  const verifiedRulesCount = rules.filter(r => r.status === 'verified' || r.status === 'user_confirmed').length;

  return (
    <div className="max-w-6xl mx-auto space-y-7 py-2 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Architecture Analysis Matrix
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            <span>{currentProject.name}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Traceable business predicates, syntax graphs, and modernization workspaces.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <TokenUsageIndicator
            projectId={currentProject.id}
            tokenUsage={currentProject.stats?.token_usage}
            isAnalyzing={currentProject.status === 'analyzing'}
          />
          {currentProject.source_type === 'url' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Globe className="w-3.5 h-3.5" />
              <span>{currentProject.source_url ? new URL(currentProject.source_url).hostname : 'Website'}</span>
            </span>
          )}
          {currentProject.source_type === 'git' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold">
              <GitBranch className="w-3.5 h-3.5" />
              <span>Branch: {currentProject.source_branch || 'main'}</span>
            </span>
          )}
          <StatusBadge status={currentProject.status} />
        </div>
      </div>

      {/* Modernization Quick Action Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-full bg-indigo-500/10 blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-3.5 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center font-bold shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">Reviewable Modernization Workspaces Ready</div>
            <p className="text-xs text-slate-300 mt-0.5">
              Inspect generated code patches with 3-panel diffs, review governing rules, or explore phased architecture modernization.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0 relative z-10 w-full md:w-auto">
          <button
            onClick={() => navigate('/changes')}
            className="flex-1 md:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Code Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {currentProject.source_type === 'url' || (currentProject.redesign_data && Object.keys(currentProject.redesign_data).length > 0) ? (
            <button
              onClick={() => navigate('/redesign')}
              className="flex-1 md:flex-initial px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>Visual Studio</span>
            </button>
          ) : (
            <button
              onClick={() => navigate('/modernization')}
              className="flex-1 md:flex-initial px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <span>Phased Roadmap</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow border-t-2 border-t-indigo-600">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Files Analyzed</span>
            <FileCode className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{currentProject.stats?.file_count || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">{(currentProject.stats?.total_loc || 0).toLocaleString()} Lines of Code</div>
        </div>

        <div
          className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer border-t-2 border-t-emerald-600 group"
          onClick={() => navigate('/rules')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Reconstructed Rules</span>
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{rules.length}</div>
          <div className="text-[11px] text-emerald-700 mt-1 font-semibold flex items-center gap-1">
            <span>{verifiedRulesCount} Verified</span>
            {conflictingRulesCount > 0 && <span className="text-rose-600">&bull; {conflictingRulesCount} Conflicting</span>}
          </div>
        </div>

        <div
          className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-300 transition-all cursor-pointer border-t-2 border-t-blue-600 group"
          onClick={() => navigate('/dependencies')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Dependency Nodes</span>
            <Network className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{deps?.stats.total_nodes || 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">{deps?.stats.total_edges || 0} Traceable AST Links</div>
        </div>

        <div
          className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer border-t-2 border-t-amber-600 group"
          onClick={() => navigate('/modernization')}
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Dead Code & Debt</span>
            <ShieldAlert className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 tracking-tight">{obsolete.length}</div>
          <div className="text-[11px] text-amber-700 mt-1 font-medium">Audited obsolete findings</div>
        </div>
      </div>

      {/* Conflict Notice Alert */}
      {conflictingRulesCount > 0 && (
        <div className="p-4 bg-rose-50/90 border border-rose-200/90 rounded-2xl text-xs text-rose-800 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold text-rose-900">{conflictingRulesCount} Discrepant Business Rules Flagged for Review</div>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Target code contradicts uploaded policy or incident findings (e.g. grace period calculation). Human sign-off required.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/rules')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs shrink-0 shadow-xs transition-colors"
          >
            Inspect Discrepancies
          </button>
        </div>
      )}

      {/* 2-Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Subsystems & Features */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              <span>Core Application Domains & Subsystems</span>
            </h2>
            <button
              onClick={() => navigate('/modernization')}
              className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1 transition-colors"
            >
              <span>View Modernization Roadmap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {features.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No core subsystems mapped yet. Run live analysis to catalog features.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {features.map((feat) => (
                <div key={feat.id} className="py-3.5 first:pt-0 last:pb-0 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs flex items-center gap-2">
                      {feat.name}
                      <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                        {feat.detected_type}
                      </span>
                    </span>
                    <StatusBadge status={feat.risk_level} size="sm" />
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{feat.description}</p>
                  {feat.related_files.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {feat.related_files.slice(0, 5).map((f) => (
                        <span key={f} className="text-[10px] font-mono bg-slate-50 border border-slate-200/80 px-2 py-0.5 rounded-md text-slate-600">
                          {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Technology Ecosystem & Language Distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-2xs space-y-5 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-3 border-b border-slate-100">
              <Cpu className="w-4 h-4 text-indigo-600" />
              <span>Technology Ecosystem</span>
            </h2>

            {/* Framework Tags */}
            <div className="pt-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detected Frameworks</div>
              <div className="flex flex-wrap gap-1.5">
                {(currentProject.frameworks || []).length > 0 ? (
                  currentProject.frameworks.map((fw) => (
                    <span key={fw} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                      {fw}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic">No external frameworks identified</span>
                )}
              </div>
            </div>

            {/* Language Distribution Donut Chart */}
            <div className="pt-4">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Code Composition</div>
              <div className="h-44 w-full">
                {langData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={langData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {langData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          border: '1px solid #1e293b',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          fontSize: '11px',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No language data indexed
                  </div>
                )}
              </div>

              {/* Language Legend */}
              <div className="space-y-1.5 pt-2">
                {langData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="font-medium text-slate-700">{entry.name}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">{entry.value.toLocaleString()} LOC</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

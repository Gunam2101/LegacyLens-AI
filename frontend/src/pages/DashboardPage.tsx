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
  AlertTriangle
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Project, BusinessRule, CoreFeature, DependencyGraph, ObsoleteFinding } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface DashboardPageProps {
  currentProject: Project | null;
}

const COLORS = ['#4f46e5', '#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

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
      <div className="p-8 text-center text-xs text-slate-500">
        Please select a project to view its modernization dashboard.
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
    <div className="max-w-6xl mx-auto space-y-8 py-2">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            Modernization Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Architectural summary and evidence synthesis for <span className="font-semibold text-slate-800">{currentProject.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={currentProject.status} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Files Analyzed</span>
            <FileCode className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{currentProject.stats?.file_count || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">{currentProject.stats?.total_loc || 0} Lines of Code</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-400 transition-colors" onClick={() => navigate('/rules')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Reconstructed Rules</span>
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{rules.length}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold flex items-center gap-1">
            <span>{verifiedRulesCount} Verified</span>
            {conflictingRulesCount > 0 && <span className="text-rose-600">&bull; {conflictingRulesCount} Conflicting</span>}
          </div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-400 transition-colors" onClick={() => navigate('/dependencies')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Dependency Nodes</span>
            <Network className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{deps?.stats.total_nodes || 0}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-medium">{deps?.stats.total_edges || 0} Traceable Links</div>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs cursor-pointer hover:border-indigo-400 transition-colors" onClick={() => navigate('/modernization')}>
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold mb-2">
            <span>Obsolete Findings</span>
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{obsolete.length}</div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">Multi-signal audited</div>
        </div>
      </div>

      {/* Conflicts Alert Banner if any */}
      {conflictingRulesCount > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <div className="font-bold">{conflictingRulesCount} Conflicting Business Rules Detected!</div>
              <p className="text-[11px] text-rose-700 mt-0.5">
                Uploaded incident reports or tickets directly contradict legacy code logic (e.g. grace period threshold). Human clarification required.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/rules')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs shrink-0"
          >
            Review Conflicts
          </button>
        </div>
      )}

      {/* Main Grid: Core Features & Languages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Features */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Candidate Core Subsystems & Features
            </h2>
            <button
              onClick={() => navigate('/modernization')}
              className="text-xs text-indigo-600 font-semibold hover:underline"
            >
              View Roadmap
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {features.map((feat) => (
              <div key={feat.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                    {feat.name}
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                      {feat.detected_type}
                    </span>
                  </span>
                  <StatusBadge status={feat.risk_level} size="sm" />
                </div>
                <p className="text-xs text-slate-500">{feat.description}</p>
                {feat.related_files.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {feat.related_files.slice(0, 4).map((f) => (
                      <span key={f} className="text-[10px] font-mono bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded text-slate-600">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Technology Stack & Language Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 mb-3">
              <Cpu className="w-4 h-4 text-indigo-600" />
              Technology Stack
            </h2>

            {/* Frameworks tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {(currentProject.frameworks || []).map((fw) => (
                <span key={fw} className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
                  {fw}
                </span>
              ))}
            </div>

            {/* Language Pie Chart */}
            <div className="h-44 w-full">
              {langData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={langData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {langData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No language data
                </div>
              )}
            </div>

            {/* Language legend */}
            <div className="space-y-1.5 pt-2">
              {langData.map((entry, idx) => (
                <div key={entry.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="font-medium text-slate-700">{entry.name}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[11px]">{entry.value} LOC</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

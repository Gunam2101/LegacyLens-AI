import React, { useEffect, useState } from 'react';
import {
  Milestone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ArrowRight,
  Sparkles,
  Layers,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { Project, ModernizationRoadmap, ObsoleteFinding } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface ModernizationPageProps {
  currentProject: Project | null;
}

export const ModernizationPage: React.FC<ModernizationPageProps> = ({ currentProject }) => {
  const [roadmap, setRoadmap] = useState<ModernizationRoadmap | null>(null);
  const [obsolete, setObsolete] = useState<ObsoleteFinding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    Promise.all([
      api.getRoadmap(currentProject.id).catch(() => null),
      api.getObsoleteFindings(currentProject.id).catch(() => [])
    ]).then(([r, o]) => {
      setRoadmap(r);
      setObsolete(o);
      setLoading(false);
    });
  }, [currentProject?.id]);

  if (!currentProject) {
    return <div className="p-8 text-center text-xs text-slate-500">Select a project to view the modernization plan.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Milestone className="w-6 h-6 text-indigo-600" />
            Phased Modernization Planner & Obsolete Code Audit
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Architecture transformation roadmap tailored to observed legacy dependencies, risks, and verified business rules.
          </p>
        </div>
      </div>

      {/* Modernization Roadmap Phases */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          Recommended 5-Phase Migration Plan
        </h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">Loading roadmap...</div>
        ) : !roadmap || roadmap.phases.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">
            No roadmap generated yet. Run initial analysis to synthesize migration phases.
          </div>
        ) : (
          <div className="space-y-4">
            {roadmap.phases.map((phase) => (
              <div
                key={phase.phase_number}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Phase {phase.phase_number}
                    </span>
                    <h3 className="font-bold text-slate-900 text-sm mt-1">{phase.title}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1 rounded-lg border border-slate-200">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Effort: {phase.estimated_effort}</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{phase.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Target Components</span>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {phase.target_components.map((c) => (
                        <span key={c} className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-700">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-indigo-50/50 rounded-xl space-y-1 border border-indigo-100">
                    <span className="text-[10px] uppercase font-bold text-indigo-700">Risk Mitigation Strategy</span>
                    <p className="text-[11px] text-slate-700 leading-relaxed">{phase.risk_mitigation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-Signal Obsolete Code Investigation */}
      <div className="space-y-4 pt-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            Multi-Signal Obsolete Code Investigation
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            LegacyLens AI prevents blind code deletion by correlating static references against incidents, config files, and tests.
          </p>
        </div>

        {obsolete.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border">
            No obsolete code candidates identified in analyzed scope.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="py-3 px-4">Component</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Observed Signals</th>
                  <th className="py-3 px-4">Recommendation</th>
                  <th className="py-3 px-4">Business Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {obsolete.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      <div>{o.component_name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{o.file_path}:{o.line_number || 1}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={o.category} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {o.signals.map((s) => (
                          <span key={s} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-sm text-slate-600 leading-relaxed">
                      {o.recommendation}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-slate-600 leading-relaxed">
                      {o.business_impact}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

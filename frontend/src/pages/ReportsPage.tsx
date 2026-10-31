import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  ExternalLink,
  Layers,
  FileSpreadsheet,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  FileCode,
  Milestone
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface ReportsPageProps {
  currentProject: Project | null;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ currentProject }) => {
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    api.getReportData(currentProject.id)
      .then(setReportData)
      .catch((e) => console.error('Failed to load report:', e))
      .finally(() => setLoading(false));
  }, [currentProject?.id]);

  if (!currentProject) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">No Active Project Selected</h2>
        <p className="text-xs text-slate-500">Please choose an application to view its executive audit package.</p>
      </div>
    );
  }

  const handleDownloadMarkdown = () => {
    window.open(api.getReportMarkdownUrl(currentProject.id), '_blank');
  };

  const handleOpenPrintableHtml = () => {
    window.open(api.getReportHtmlUrl(currentProject.id), '_blank');
  };

  const handleDownloadJson = () => {
    if (!reportData) return;
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `legacylens_report_${currentProject.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Comprehensive Audit Export
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Modernization Report & Audit Package</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete executive and technical report package with source references, rule catalogues, and human sign-off trail.
          </p>
        </div>

        {/* Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDownloadMarkdown}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200/90 shadow-2xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Markdown (.md)</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200/90 shadow-2xs flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>JSON Payload</span>
          </button>

          <button
            onClick={handleOpenPrintableHtml}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm shadow-indigo-600/30 flex items-center gap-1.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>Printable HTML</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/90 shadow-2xs">
          Compiling modernization audit package and synthesizing evidence...
        </div>
      ) : reportData ? (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-2xs space-y-8 text-xs text-slate-700 leading-relaxed">
          {/* Cover Header */}
          <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-full tracking-wider">
                Autonomous Modernization Audit
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{reportData.metadata.project_name}</h2>
              <p className="text-slate-500">{reportData.metadata.description || 'Enterprise Application Assessment'}</p>
            </div>
            <div className="text-left sm:text-right text-[11px] text-slate-500 space-y-0.5 font-mono">
              <div>Generated: {new Date(reportData.metadata.generated_at).toLocaleString()} UTC</div>
              <div className="text-indigo-600 font-semibold">{reportData.metadata.agent}</div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>1. Executive Overview & Technical Inventory</span>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 bg-slate-50/80 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Indexed Files</span>
                <span className="font-extrabold text-slate-900 text-base font-mono">{reportData.metadata.stats?.file_count || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Total LOC</span>
                <span className="font-extrabold text-slate-900 text-base font-mono">{(reportData.metadata.stats?.total_loc || 0).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Business Rules</span>
                <span className="font-extrabold text-slate-900 text-base font-mono">{reportData.business_rules.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Obsolete Findings</span>
                <span className="font-extrabold text-slate-900 text-base font-mono">{reportData.obsolete_findings.length}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Reconstructed Rules Summary */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>2. Reconstructed Business Policies Catalogue</span>
            </h3>
            <div className="border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200/80 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Rule</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.business_rules.slice(0, 8).map((r: any) => (
                    <tr key={r.rule_code} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3 font-mono font-bold text-indigo-700">{r.rule_code}</td>
                      <td className="p-3 max-w-sm font-medium text-slate-800">{r.description}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{r.source_file}:{r.line_range}</td>
                      <td className="p-3">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="p-3 font-mono text-[11px] font-semibold text-slate-700">{(r.confidence * 100).toFixed(0)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Modernization Plan */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>3. Modernization Phased Roadmap</span>
            </h3>
            <div className="space-y-3">
              {reportData.modernization_plan.map((p: any) => (
                <div key={p.phase_number} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-1 shadow-2xs">
                  <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                    <span>Phase {p.phase_number}: {p.title}</span>
                    <span className="text-slate-500 font-medium text-[11px]">{p.estimated_effort}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Human Decisions & Audit Trail */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>4. Human Verification & Audit Trail</span>
            </h3>
            {reportData.audit_trail.length === 0 ? (
              <p className="text-slate-400 italic p-3 bg-slate-50 rounded-xl border border-slate-100">
                No manual overrides logged yet. Current rules match autonomous AST extractions.
              </p>
            ) : (
              <div className="space-y-2">
                {reportData.audit_trail.map((a: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 text-[11px] flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="font-semibold text-slate-800">Rule {a.rule_id}:</span> {a.previous_status || 'initial'} &rarr; <strong className="text-indigo-600">{a.new_status}</strong> ({a.reason})
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

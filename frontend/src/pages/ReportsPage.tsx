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
  CheckCircle2
} from 'lucide-react';
import { Project } from '../types';
import { api } from '../services/api';

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
    return <div className="p-8 text-center text-xs text-slate-500">Select a project to generate reports.</div>;
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
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" />
            Modernization Report & Audit Package
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Complete executive and technical report package with source references, rule catalogues, and human sign-off trail.
          </p>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadMarkdown}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download Markdown (.md)</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 shadow-xs flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download JSON</span>
          </button>

          <button
            onClick={handleOpenPrintableHtml}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs flex items-center gap-2 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Printable HTML Report</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-400 bg-white rounded-2xl border">
          Compiling modernization audit package...
        </div>
      ) : reportData ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xs space-y-8 text-xs text-slate-700 leading-relaxed">
          {/* Cover Header */}
          <div className="border-b border-slate-200 pb-6 flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-extrabold text-indigo-600 tracking-wider">
                Autonomous Modernization Audit
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900">{reportData.metadata.project_name}</h2>
              <p className="text-slate-500">{reportData.metadata.description || 'Enterprise Application Assessment'}</p>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div>Generated: {new Date(reportData.metadata.generated_at).toLocaleString()} UTC</div>
              <div>Agent: {reportData.metadata.agent}</div>
            </div>
          </div>

          {/* Section 1: Executive Summary */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              1. Executive Overview & Technical Inventory
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Files</span>
                <span className="font-bold text-slate-800 text-sm">{reportData.metadata.stats?.file_count || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total LOC</span>
                <span className="font-bold text-slate-800 text-sm">{reportData.metadata.stats?.total_loc || 0}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Business Rules</span>
                <span className="font-bold text-slate-800 text-sm">{reportData.business_rules.length}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Obsolete Findings</span>
                <span className="font-bold text-slate-800 text-sm">{reportData.obsolete_findings.length}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Reconstructed Rules Summary */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              2. Business Rule Reconstruction Catalogue
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b text-slate-500 font-semibold text-[10px] uppercase">
                  <tr>
                    <th className="p-3">Rule</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Location</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Conf.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportData.business_rules.slice(0, 8).map((r: any) => (
                    <tr key={r.rule_code} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-bold text-indigo-700">{r.rule_code}</td>
                      <td className="p-3 max-w-sm">{r.description}</td>
                      <td className="p-3 font-mono text-slate-400 text-[11px]">{r.source_file}:{r.line_range}</td>
                      <td className="p-3 font-semibold uppercase text-[10px]">{r.status}</td>
                      <td className="p-3 font-mono text-[11px]">{(r.confidence * 100).toFixed(0)}%</td>
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
              3. Recommended Modernization Roadmap
            </h3>
            <div className="space-y-3">
              {reportData.modernization_plan.map((p: any) => (
                <div key={p.phase_number} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Phase {p.phase_number}: {p.title}</span>
                    <span className="text-slate-400 font-normal text-[11px]">{p.estimated_effort}</span>
                  </div>
                  <p className="text-slate-600">{p.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Human Decisions & Audit Trail */}
          <div className="space-y-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              4. Human Verification & Audit Decisions
            </h3>
            {reportData.audit_trail.length === 0 ? (
              <p className="text-slate-400 italic">No human rule overrides recorded yet.</p>
            ) : (
              <div className="space-y-2">
                {reportData.audit_trail.map((a: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800">Rule {a.rule_id}:</span> {a.previous_status || 'initial'} &rarr; <strong className="text-indigo-600">{a.new_status}</strong> ({a.reason})
                    </div>
                    <span className="text-slate-400 text-[10px]">{new Date(a.timestamp).toLocaleTimeString()}</span>
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

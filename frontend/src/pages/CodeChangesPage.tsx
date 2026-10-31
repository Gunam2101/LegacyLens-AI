import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Project, CodeProposal } from '../types';
import { api } from '../services/api';
import { CodeDiffViewer } from '../components/CodeDiffViewer';
import { StatusBadge } from '../components/StatusBadge';

interface CodeChangesPageProps {
  currentProject: Project | null;
}

export const CodeChangesPage: React.FC<CodeChangesPageProps> = ({ currentProject }) => {
  const [proposals, setProposals] = useState<CodeProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<CodeProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProposals = () => {
    if (!currentProject) return;
    setLoading(true);
    api.getCodeProposals(currentProject.id)
      .then((data) => {
        setProposals(data);
        if (data.length > 0 && !selectedProposal) {
          setSelectedProposal(data[0]);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProposals();
  }, [currentProject?.id]);

  const handleDecision = async (status: 'approved' | 'rejected') => {
    if (!selectedProposal) return;
    setActionLoading(true);
    try {
      const updated = await api.approveProposal(selectedProposal.id, status, `Architect decision: ${status}`);
      setSelectedProposal(updated);
      fetchProposals();
    } catch (e: any) {
      alert(`Approval action failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentProject) {
    return <div className="p-8 text-center text-xs text-slate-500">Select a project to inspect proposed code changes.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitCompare className="w-6 h-6 text-indigo-600" />
            Modernization Code Changes & Human Approval Gate
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review proposed refactorings in the isolated modernization sandbox. Consequential changes require explicit human sign-off.
          </p>
        </div>
      </div>

      {proposals.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          No modernization code proposals synthesized for this project yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Proposals List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Candidate Proposals</div>
            <div className="space-y-2">
              {proposals.map((prop) => (
                <div
                  key={prop.id}
                  onClick={() => setSelectedProposal(prop)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedProposal?.id === prop.id
                      ? 'bg-indigo-50/70 border-indigo-400 shadow-xs ring-2 ring-indigo-500/10'
                      : 'bg-white border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-xs text-slate-900 line-clamp-1">{prop.title}</span>
                    <StatusBadge status={prop.approval_status} size="sm" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 truncate">{prop.file_path}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Proposal Details & Diff Viewer */}
          <div className="md:col-span-2 space-y-5">
            {selectedProposal && (
              <div className="space-y-4">
                {/* Proposal Info Box */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">{selectedProposal.title}</h2>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">{selectedProposal.file_path}</div>
                    </div>
                    <StatusBadge status={selectedProposal.approval_status} />
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <strong>Modernization Rationale:</strong> {selectedProposal.rationale}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span className="font-medium text-slate-700">Behaviour Gate:</span>
                      <StatusBadge status={selectedProposal.preservation_gate_status} size="sm" />
                    </div>

                    {/* Approval Decision Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        disabled={actionLoading || selectedProposal.approval_status === 'approved'}
                        onClick={() => handleDecision('approved')}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve Modernization</span>
                      </button>

                      <button
                        disabled={actionLoading || selectedProposal.approval_status === 'rejected'}
                        onClick={() => handleDecision('rejected')}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject Change</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Unified / Split Diff Viewer */}
                <CodeDiffViewer
                  filePath={selectedProposal.file_path}
                  originalCode={selectedProposal.original_code}
                  proposedCode={selectedProposal.proposed_code}
                  diffContent={selectedProposal.diff_content}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

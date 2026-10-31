import React, { useEffect, useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  History,
  Info,
  ExternalLink,
  Code2,
  X,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { Project, BusinessRule, RuleAuditLog } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface BusinessRulesPageProps {
  currentProject: Project | null;
}

export const BusinessRulesPage: React.FC<BusinessRulesPageProps> = ({ currentProject }) => {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [selectedRule, setSelectedRule] = useState<BusinessRule | null>(null);
  const [auditLogs, setAuditLogs] = useState<RuleAuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [auditReason, setAuditReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRules = () => {
    if (!currentProject) return;
    setLoading(true);
    api.getBusinessRules(currentProject.id, statusFilter || undefined, search || undefined)
      .then(setRules)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRules();
  }, [currentProject?.id, statusFilter, search]);

  const handleSelectRule = async (rule: BusinessRule) => {
    setSelectedRule(rule);
    try {
      const logs = await api.getRuleAuditLogs(rule.id);
      setAuditLogs(logs);
    } catch (e) {
      setAuditLogs([]);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedRule) return;
    setActionLoading(true);
    try {
      const updated = await api.updateRuleStatus(
        selectedRule.id,
        newStatus,
        auditReason || `User decision: marked as ${newStatus}`
      );
      setSelectedRule(updated);
      setAuditReason('');
      fetchRules();
      const logs = await api.getRuleAuditLogs(selectedRule.id);
      setAuditLogs(logs);
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  if (!currentProject) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <FileSpreadsheet className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">No Active Project Selected</h2>
        <p className="text-xs text-slate-500">Please choose an application to inspect reconstructed business rules.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/80 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Traceable Business Rules
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            <span>Business Rule Reconstruction Catalogue</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Traceable business policies extracted from AST branches, SQL check constraints, and incident documents.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-slate-50 border border-slate-200/90 rounded-xl px-3 py-2 text-xs focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500 transition-all">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search rules, keywords, formulas, or files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-500">Filter Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50/80 font-medium text-slate-700 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <option value="">All Statuses ({rules.length})</option>
            <option value="verified">Verified</option>
            <option value="conflicting">Conflicting</option>
            <option value="inferred">Inferred</option>
            <option value="user_confirmed">User Confirmed</option>
            <option value="user_rejected">User Rejected</option>
          </select>
        </div>
      </div>

      {/* Rules Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-widest font-bold text-[10px]">
              <tr>
                <th className="py-3 px-4">Rule Code</th>
                <th className="py-3 px-4">Business Predicate Description</th>
                <th className="py-3 px-4">Source Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 italic">
                    {loading ? 'Cataloging reconstructed business predicates...' : 'No business rules match the search criteria.'}
                  </td>
                </tr>
              ) : (
                rules.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => handleSelectRule(r)}
                    className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                      selectedRule?.id === r.id ? 'bg-indigo-50/60' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{r.rule_code}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-900 max-w-md">
                      <div className="line-clamp-2 leading-relaxed">{r.description}</div>
                      {r.conflicting_evidence && (
                        <div className="text-[10px] text-rose-700 font-semibold mt-1 flex items-center gap-1.5 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/80 w-fit">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Contradicted by incident documentation</span>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                        {r.source_file}:{r.line_start || 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                          <div
                            className={`h-full rounded-full ${
                              r.confidence >= 0.85 ? 'bg-emerald-500' : r.confidence >= 0.65 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${r.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono font-semibold">{(r.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRule(r);
                        }}
                        className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-semibold text-[11px] transition-colors shadow-2xs"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Rule Detail Drawer / Modal Card */}
      {selectedRule && (
        <div className="bg-white rounded-2xl border border-indigo-200/90 p-6 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-start justify-between border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-extrabold text-indigo-700">{selectedRule.rule_code}</span>
                <StatusBadge status={selectedRule.status} />
              </div>
              <h2 className="text-base font-bold text-slate-900 mt-1 tracking-tight">{selectedRule.description}</h2>
            </div>
            <button
              onClick={() => setSelectedRule(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Left: Code excerpt */}
            <div className="space-y-3">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-600" />
                <span>Extracted AST Source Quote</span>
              </span>

              <div className="bg-slate-950 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800 shadow-md">
                <div className="text-slate-500 pb-2 mb-2 border-b border-slate-800 flex items-center justify-between">
                  <span>// File: {selectedRule.source_file}</span>
                  <span>Lines {selectedRule.line_start || 1}-{selectedRule.line_end || selectedRule.line_start || 1}</span>
                </div>
                <pre className="leading-relaxed text-indigo-200">{selectedRule.evidence_quote || '// Evidence snippet captured via AST'}</pre>
              </div>

              {selectedRule.conflicting_evidence && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl space-y-1.5">
                  <span className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Contradicting Incident Finding</span>
                  </span>
                  <p className="text-[11px] leading-relaxed text-rose-700">{selectedRule.conflicting_evidence}</p>
                </div>
              )}
            </div>

            {/* Right: Human Decision & Audit Trail */}
            <div className="space-y-4">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-indigo-600" />
                <span>Human Review Gate & Audit Trail</span>
              </span>

              {/* Action Decision Form */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-3">
                <div className="text-[11px] text-slate-700 font-semibold">Confirm or Override Inferred Business Policy:</div>
                <input
                  type="text"
                  placeholder="Reviewer rationale or ticket reference (e.g. Confirmed per CR-8812)..."
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                />
                <div className="flex gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('user_confirmed')}
                    className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Confirm Rule</span>
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus('user_rejected')}
                    className="flex-1 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject Rule</span>
                  </button>
                </div>
              </div>

              {/* Audit Trail List */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Historical Decision Timeline</span>
                {auditLogs.length === 0 ? (
                  <div className="text-slate-400 text-[11px] italic p-3 bg-slate-50 rounded-lg border border-slate-200/60">
                    No manual overrides logged. Currently in automated inferred state.
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 rounded-lg bg-white border border-slate-200 text-[11px] space-y-1 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">Status &rarr; {log.new_status}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[10px]">{log.reason}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  Sparkles,
  ArrowRight,
  Folder,
  FolderOpen,
  File,
  Search,
  Filter,
  Download,
  RotateCcw,
  Play,
  Edit3,
  Save,
  Check,
  Eye,
  Layers,
  Code
} from 'lucide-react';
import { Project, CodeProposal, FileNode, FileTreeResponse, FileContentResponse } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface CodeChangesPageProps {
  currentProject: Project | null;
}

export const CodeChangesPage: React.FC<CodeChangesPageProps> = ({ currentProject }) => {
  // Proposals state
  const [proposals, setProposals] = useState<CodeProposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<CodeProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'warning' | 'error' } | null>(null);

  // File Tree state
  const [fileTree, setFileTree] = useState<FileTreeResponse | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [langFilter, setLangFilter] = useState('all');
  const [selectedFileContent, setSelectedFileContent] = useState<FileContentResponse | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');

  // Centre Viewer state
  const [viewTab, setViewTab] = useState<'diff' | 'original' | 'proposed'>('diff');
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState('');
  const [editedRationale, setEditedRationale] = useState('');

  const loadData = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const [props, tree] = await Promise.all([
        api.getCodeProposals(currentProject.id),
        api.getFileTree(currentProject.id).catch(() => null)
      ]);
      setProposals(props);
      setFileTree(tree);

      if (props.length > 0) {
        setSelectedProposal(props[0]);
        setSelectedFilePath(props[0].file_path);
      }
    } catch (e: any) {
      console.error('Failed to load code changes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentProject?.id]);

  useEffect(() => {
    if (selectedProposal) {
      setEditedCode(selectedProposal.proposed_code);
      setEditedRationale(selectedProposal.rationale);
      setIsEditing(false);
    }
  }, [selectedProposal?.id]);

  // Load raw file content when file clicked in explorer
  const handleSelectFile = async (node: FileNode) => {
    if (node.is_dir || !currentProject) return;
    setSelectedFilePath(node.path);

    // Check if this file has an associated proposal
    const matchingProp = proposals.find(p => p.file_path === node.path);
    if (matchingProp) {
      setSelectedProposal(matchingProp);
    }

    try {
      const content = await api.getFileContent(currentProject.id, node.path);
      setSelectedFileContent(content);
    } catch (e) {
      console.error(e);
    }
  };

  // Change Approval Action
  const handleDecision = async (status: 'approved' | 'rejected' | 'skipped') => {
    if (!selectedProposal) return;
    setActionLoading(true);
    try {
      const updated = await api.updateProposalStatus(selectedProposal.id, status, `Architect action: ${status}`);
      setSelectedProposal(updated);
      setFeedbackMsg({
        text: `Proposal ${updated.change_id || updated.id.slice(0, 8)} marked as ${status.toUpperCase()}.`,
        type: status === 'approved' ? 'success' : 'warning'
      });
      // Refresh list
      const refreshed = await api.getCodeProposals(currentProject!.id);
      setProposals(refreshed);
    } catch (e: any) {
      setFeedbackMsg({ text: `Action failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Revert Proposal
  const handleRevert = async () => {
    if (!selectedProposal) return;
    setActionLoading(true);
    try {
      const reverted = await api.revertProposal(selectedProposal.id);
      setSelectedProposal(reverted);
      setFeedbackMsg({ text: `Change ${reverted.change_id} reverted back to original source.`, type: 'warning' });
      const refreshed = await api.getCodeProposals(currentProject!.id);
      setProposals(refreshed);
    } catch (e: any) {
      setFeedbackMsg({ text: `Revert failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Save Edit
  const handleSaveEdit = async () => {
    if (!selectedProposal) return;
    setActionLoading(true);
    try {
      const updated = await api.editProposal(selectedProposal.id, {
        proposed_code: editedCode,
        rationale: editedRationale
      });
      setSelectedProposal(updated);
      setIsEditing(false);
      setFeedbackMsg({ text: `Change ${updated.change_id} updated and diff recalculated.`, type: 'success' });
      const refreshed = await api.getCodeProposals(currentProject!.id);
      setProposals(refreshed);
    } catch (e: any) {
      setFeedbackMsg({ text: `Edit failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  // Apply All Approved
  const handleApplyApproved = async () => {
    if (!currentProject) return;
    setActionLoading(true);
    try {
      const res = await api.applyApprovedProposals(currentProject.id);
      setFeedbackMsg({
        text: `Successfully applied ${res.applied_count} approved changes into modernized sandbox!`,
        type: 'success'
      });
      loadData();
    } catch (e: any) {
      setFeedbackMsg({ text: `Apply failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 5000);
    }
  };

  // Rollback All
  const handleRollbackAll = async () => {
    if (!currentProject || !window.confirm('Reset modernized workspace back to exact source state?')) return;
    setActionLoading(true);
    try {
      await api.rollbackAllProposals(currentProject.id);
      setFeedbackMsg({ text: 'Modernized workspace cleanly rolled back to original source.', type: 'warning' });
      loadData();
    } catch (e: any) {
      setFeedbackMsg({ text: `Rollback failed: ${e.message}`, type: 'error' });
    } finally {
      setActionLoading(false);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  if (!currentProject) {
    return <div className="p-8 text-center text-xs text-slate-500">Select a project to open the Code Explorer.</div>;
  }

  // Recursive Tree Node Renderer
  const renderTreeNode = (node: FileNode, depth = 0) => {
    const isMatchingSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isMatchingLang = langFilter === 'all' || node.language === langFilter;

    if (!node.is_dir && (!isMatchingSearch || !isMatchingLang)) {
      return null;
    }

    const isSelected = selectedFilePath === node.path;
    const hasProposal = proposals.some(p => p.file_path === node.path);

    if (node.is_dir) {
      return (
        <div key={node.path || node.name} className="space-y-0.5">
          <div
            className="flex items-center gap-1.5 px-2 py-1 text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer text-xs select-none"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <Folder className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-semibold text-[11px] truncate">{node.name}</span>
          </div>
          {node.children && node.children.map(child => renderTreeNode(child, depth + 1))}
        </div>
      );
    }

    let statusDot = 'bg-slate-300';
    if (node.status === 'modified' || hasProposal) statusDot = 'bg-amber-500';
    if (node.status === 'added') statusDot = 'bg-emerald-500';
    if (node.status === 'removed') statusDot = 'bg-rose-500';

    return (
      <div
        key={node.path}
        onClick={() => handleSelectFile(node)}
        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer text-xs select-none transition-all ${
          isSelected
            ? 'bg-indigo-50/90 text-indigo-900 font-semibold ring-1 ring-indigo-200 shadow-xs'
            : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex items-center gap-2 truncate">
          <FileCode className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span className="truncate text-[11px] tracking-tight">{node.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {hasProposal && (
            <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-bold tracking-wider">CHG</span>
          )}
          <span className={`w-2 h-2 rounded-full ${statusDot}`} title={`Status: ${node.status || 'unchanged'}`} />
        </div>
      </div>
    );
  };

  const currentDisplayOriginal = selectedProposal?.original_code || selectedFileContent?.original_content || '// Select a file to inspect original source';
  const currentDisplayProposed = selectedProposal?.proposed_code || selectedFileContent?.modernized_content || currentDisplayOriginal;
  const currentDisplayDiff = selectedProposal?.diff_content || '';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Global Action Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold tracking-wider uppercase border border-indigo-100">
              Controlled Modernization Gate
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-500 font-medium">AST-Preserved Differential Patching</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GitCompare className="w-6 h-6 text-indigo-600" />
            Code Explorer & Change Gate
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Audit proposed code refactorings, inspect unified differential patches, and enforce human sign-off before applying code updates into the modernized sandbox.
          </p>
        </div>

        {/* Global Batch Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleApplyApproved}
            disabled={actionLoading}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" />
            <span>Apply Approved to Sandbox</span>
          </button>

          <a
            href={api.getPatchUrl(currentProject.id)}
            download
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-semibold text-xs flex items-center gap-2 shadow-xs transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Export .patch</span>
          </a>

          <button
            onClick={handleRollbackAll}
            disabled={actionLoading}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 border border-rose-200/80 font-semibold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
            title="Roll back modernized workspace to exact source replica"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Rollback All</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 transition-all ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          feedbackMsg.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800' :
          'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
          <span className="font-medium">{feedbackMsg.text}</span>
        </div>
      )}

      {/* 3-PANEL INTERACTIVE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* PANEL 1: LEFT FILE TREE EXPLORER (col-span-3) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3.5 max-h-[780px] flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">File Explorer</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded-full font-semibold">
              {fileTree?.total_files || 0} files
            </span>
          </div>

          {/* Search & Filters */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs p-2 pl-8 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            <select
              value={langFilter}
              onChange={(e) => setLangFilter(e.target.value)}
              className="w-full text-xs p-2 rounded-xl border border-slate-200 outline-none bg-white text-slate-600 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="all">All Languages</option>
              <option value="python">Python (.py)</option>
              <option value="javascript">JavaScript (.js, .jsx)</option>
              <option value="typescript">TypeScript (.ts, .tsx)</option>
              <option value="sql">SQL (.sql)</option>
              <option value="html">HTML (.html)</option>
            </select>
          </div>

          {/* File Tree List */}
          <div className="flex-1 overflow-y-auto space-y-0.5 pr-1 max-h-[600px]">
            {fileTree?.root?.children ? (
              fileTree.root.children.map(child => renderTreeNode(child, 0))
            ) : (
              <div className="text-center py-12 text-xs text-slate-400">Loading files...</div>
            )}
          </div>
        </div>

        {/* PANEL 2: CENTRE DIFF & SOURCE VIEWER (col-span-6) */}
        <div className="lg:col-span-6 bg-slate-950 rounded-2xl border border-slate-800 shadow-xl flex flex-col overflow-hidden max-h-[780px]">
          {/* Top Bar with file path and View Tabs */}
          <div className="bg-slate-900/90 backdrop-blur-md text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3 truncate">
              {/* Window Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></div>
              </div>
              <span className="font-mono text-xs text-slate-200 truncate font-medium">
                {selectedFilePath || 'Select a file from explorer'}
              </span>
            </div>

            {/* View Tabs */}
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl text-xs border border-slate-800">
              <button
                onClick={() => setViewTab('diff')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewTab === 'diff' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Diff
              </button>
              <button
                onClick={() => setViewTab('original')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewTab === 'original' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Original
              </button>
              <button
                onClick={() => setViewTab('proposed')}
                className={`px-3 py-1 rounded-lg font-medium transition-all ${
                  viewTab === 'proposed' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                }`}
              >
                Modernized
              </button>
            </div>
          </div>

          {/* Code Body */}
          <div className="flex-1 overflow-auto bg-slate-950 font-mono text-[12px] text-slate-300 p-4 leading-relaxed max-h-[710px]">
            {isEditing && selectedProposal ? (
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                rows={28}
                className="w-full h-full bg-slate-900/90 text-slate-200 p-4 rounded-xl border border-indigo-500/50 outline-none font-mono text-xs leading-relaxed focus:ring-2 focus:ring-indigo-500/30"
              />
            ) : viewTab === 'diff' ? (
              currentDisplayDiff ? (
                currentDisplayDiff.split('\n').map((line, idx) => {
                  let cls = 'text-slate-400';
                  if (line.startsWith('+') && !line.startsWith('+++')) {
                    cls = 'bg-emerald-950/40 text-emerald-300 border-l-2 border-emerald-500 pl-2 py-0.5';
                  } else if (line.startsWith('-') && !line.startsWith('---')) {
                    cls = 'bg-rose-950/40 text-rose-300 border-l-2 border-rose-500 pl-2 py-0.5';
                  } else if (line.startsWith('@@')) {
                    cls = 'text-indigo-400 font-semibold py-1 bg-indigo-950/30 pl-2 rounded-xs my-0.5';
                  }
                  return (
                    <div key={idx} className={`${cls} whitespace-pre hover:bg-slate-900/40 font-mono`}>
                      {line || ' '}
                    </div>
                  );
                })
              ) : (
                <div className="text-slate-500 py-16 text-center text-xs">
                  No proposed differential changes recorded for this file yet. Original file is intact.
                </div>
              )
            ) : viewTab === 'original' ? (
              currentDisplayOriginal.split('\n').map((line, idx) => (
                <div key={idx} className="flex gap-4 hover:bg-slate-900/40 py-0.5">
                  <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                  <span className="whitespace-pre text-slate-300">{line || ' '}</span>
                </div>
              ))
            ) : (
              currentDisplayProposed.split('\n').map((line, idx) => (
                <div key={idx} className="flex gap-4 hover:bg-slate-900/40 py-0.5">
                  <span className="text-slate-600 select-none w-8 text-right shrink-0">{idx + 1}</span>
                  <span className="whitespace-pre text-emerald-300">{line || ' '}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL 3: RIGHT FINDINGS & CHANGE APPROVAL CONTROLS (col-span-3) */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4 max-h-[780px] overflow-y-auto">
          {selectedProposal ? (
            <>
              {/* Proposal Header */}
              <div className="space-y-2 pb-3.5 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-[10px] font-mono tracking-wide">
                    {selectedProposal.change_id || 'CHG-PROPOSAL'}
                  </span>
                  <StatusBadge status={selectedProposal.approval_status} size="sm" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm leading-snug">{selectedProposal.title}</h3>
                <span className="text-[11px] text-slate-500 font-mono block truncate bg-slate-50 p-1.5 rounded-lg border border-slate-100" title={selectedProposal.file_path}>
                  {selectedProposal.file_path}
                </span>
              </div>

              {/* Rationale */}
              <div className="space-y-1.5">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Rationale</span>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-3 rounded-xl border border-slate-100">
                  {selectedProposal.rationale}
                </p>
              </div>

              {/* Supporting Evidence */}
              <div className="space-y-1.5">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Supporting Evidence</span>
                <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
                  <div className="font-semibold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Source AST Refactoring Contract</span>
                  </div>
                  {selectedProposal.affected_rules && selectedProposal.affected_rules.length > 0 && (
                    <div className="text-[11px] text-indigo-700 font-medium">
                      Governing Rules: {selectedProposal.affected_rules.join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {/* Preservation Gate Status */}
              <div className="space-y-1.5">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Behaviour Gate</span>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-emerald-900 font-semibold capitalize">
                    {selectedProposal.preservation_gate_status || 'passed'}
                  </span>
                </div>
              </div>

              {/* Approval Action Controls */}
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="font-bold text-[10px] text-slate-400 uppercase tracking-wider block">Human Sign-Off</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleDecision('approved')}
                    disabled={actionLoading || selectedProposal.approval_status === 'approved'}
                    className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs disabled:bg-slate-200 disabled:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() => handleDecision('rejected')}
                    disabled={actionLoading || selectedProposal.approval_status === 'rejected'}
                    className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 active:scale-[0.98] text-rose-700 border border-rose-200 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:bg-slate-100 disabled:text-slate-400 transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  {isEditing ? (
                    <button
                      onClick={handleSaveEdit}
                      disabled={actionLoading}
                      className="p-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 col-span-2 shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save & Recalculate Diff</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Code</span>
                    </button>
                  )}

                  <button
                    onClick={handleRevert}
                    disabled={actionLoading}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-16 text-xs text-slate-400">
              Select a file or change proposal to inspect evidence and review controls.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

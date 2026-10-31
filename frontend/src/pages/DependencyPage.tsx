import React, { useEffect, useState } from 'react';
import { Network, Filter, AlertTriangle, ShieldCheck, Info, X } from 'lucide-react';
import { Project, DependencyGraph as IDependencyGraph, DependencyNode } from '../types';
import { api } from '../services/api';
import { DependencyGraph } from '../components/DependencyGraph';
import { StatusBadge } from '../components/StatusBadge';

interface DependencyPageProps {
  currentProject: Project | null;
}

export const DependencyPage: React.FC<DependencyPageProps> = ({ currentProject }) => {
  const [graphData, setGraphData] = useState<IDependencyGraph | null>(null);
  const [selectedNode, setSelectedNode] = useState<DependencyNode | null>(null);
  const [nodeTypeFilter, setNodeTypeFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentProject) return;
    setLoading(true);
    api.getDependencies(currentProject.id, nodeTypeFilter || undefined, riskFilter || undefined)
      .then(setGraphData)
      .finally(() => setLoading(false));
  }, [currentProject?.id, nodeTypeFilter, riskFilter]);

  if (!currentProject) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Network className="w-6 h-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-800">No Active Project Selected</h2>
        <p className="text-xs text-slate-500">Please choose an application to view the dependency syntax graph.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              AST Call Graph
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Network className="w-6 h-6 text-blue-600" />
            <span>Evidence-Based Dependency Explorer</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Traceable architectural relationships mapped from AST calls, SQL schemas, and endpoint bindings.
          </p>
        </div>
      </div>

      {/* Filter and Metrics Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Entity:</span>
            <select
              value={nodeTypeFilter}
              onChange={(e) => setNodeTypeFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <option value="">All Entities</option>
              <option value="module">Modules Only</option>
              <option value="function">Functions Only</option>
              <option value="endpoint">API Endpoints</option>
              <option value="table">SQL Tables</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500">Coupling Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="py-1.5 px-3 rounded-xl border border-slate-200 bg-slate-50 font-medium text-slate-700 outline-none hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <option value="">All Risk Tiers</option>
              <option value="high">High Risk (High In-Degree)</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
        </div>

        {graphData && (
          <div className="flex items-center gap-3 text-slate-500 font-medium font-mono text-[11px]">
            <span>{graphData.stats.total_nodes} Nodes</span>
            <span>&bull;</span>
            <span>{graphData.stats.total_edges} Connections</span>
            <span>&bull;</span>
            <span className="text-rose-600 font-semibold">{graphData.stats.high_risk_count} High-Coupling Nodes</span>
          </div>
        )}
      </div>

      {/* Graph Area */}
      {loading ? (
        <div className="h-[600px] bg-slate-950 rounded-3xl border border-slate-800 flex items-center justify-center text-slate-400 text-xs shadow-xl">
          Constructing AST syntax dependency canvas...
        </div>
      ) : graphData ? (
        <div className="rounded-3xl overflow-hidden border border-slate-200/90 shadow-md">
          <DependencyGraph
            nodes={graphData.nodes}
            edges={graphData.edges}
            onSelectNode={setSelectedNode}
          />
        </div>
      ) : null}

      {/* Node Inspector Drawer */}
      {selectedNode && (
        <div className="bg-white p-6 rounded-3xl border border-indigo-200/90 shadow-xl text-xs space-y-4 animate-fade-in">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-900 tracking-tight">{selectedNode.name}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                {selectedNode.node_type}
              </span>
              <StatusBadge status={selectedNode.risk_level} size="sm" />
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-slate-600">
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">File Location</span>
              <span className="font-mono text-[11px] text-slate-800 font-medium">{selectedNode.file_path || 'External / System'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Line Number</span>
              <span className="font-mono text-[11px] text-slate-800 font-medium">{selectedNode.line_number || 'Top-level'}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Node Key</span>
              <span className="font-mono text-[11px] text-slate-800 truncate block font-medium">{selectedNode.node_key}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider mb-0.5">Coupling Risk</span>
              <span className="font-semibold text-slate-800 capitalize">{selectedNode.risk_level} impact</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
